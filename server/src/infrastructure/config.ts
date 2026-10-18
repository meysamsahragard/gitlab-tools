import fs from 'node:fs';
import path from 'node:path';
import type { ConfiguredProject } from '@gitlab-tools/shared';
import { HttpError } from './httpError.ts';

export interface AppConfig {
  server: {
    port: number;
    host: string;
    clientOrigin: string;
  };
  cache: {
    ttlSeconds: number;
  };
  gitlab: {
    baseUrl: string;
    token: string;
    perPage: number;
    maxMergeRequests: number;
    maxCollectIds: number;
    maxDiscussionsPerMergeRequest: number;
    aggregateConcurrency: number;
    projects: ConfiguredProject[];
  };
  activeProjectId: string;
}

export function loadConfig(rootDir: string): AppConfig {
  const configPath = path.join(rootDir, 'config', 'default.json');
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown error';
    throw new Error(`Could not read ${configPath}: ${detail}`);
  }

  const root = expectRecord(parsed, 'config');
  if (isRecord(root.gitlab) && 'token' in root.gitlab) {
    throw new Error('Do not store a token in config/default.json. Set GITLAB_TOKEN in the .env file.');
  }

  const server = expectRecord(root.server, 'server');
  const cache = expectRecord(root.cache, 'cache');
  const gitlab = expectRecord(root.gitlab, 'gitlab');
  const projects = parseProjects(gitlab.projects);
  const active = projects.find((project) => project.default);
  if (!active) throw new Error('config gitlab.projects must include a default project.');

  const port = process.env.PORT ? expectPort(process.env.PORT) : expectNumber(server.port, 'server.port', 1, 65535);

  return {
    server: {
      port,
      host: process.env.HOST?.trim() || expectString(server.host, 'server.host'),
      clientOrigin: stripTrailingSlash(
        process.env.CLIENT_ORIGIN?.trim() || expectUrl(server.clientOrigin, 'server.clientOrigin'),
      ),
    },
    cache: {
      ttlSeconds: expectNumber(cache.ttlSeconds, 'cache.ttlSeconds', 0, 86_400),
    },
    gitlab: {
      baseUrl: stripTrailingSlash(process.env.GITLAB_BASE_URL?.trim() || expectUrl(gitlab.baseUrl, 'gitlab.baseUrl')),
      token: process.env.GITLAB_TOKEN?.trim() ?? '',
      perPage: expectNumber(gitlab.perPage, 'gitlab.perPage', 1, 100),
      maxMergeRequests: expectNumber(gitlab.maxMergeRequests, 'gitlab.maxMergeRequests', 1, 1000),
      maxCollectIds: expectNumber(gitlab.maxCollectIds, 'gitlab.maxCollectIds', 1, 200),
      maxDiscussionsPerMergeRequest: expectNumber(
        gitlab.maxDiscussionsPerMergeRequest,
        'gitlab.maxDiscussionsPerMergeRequest',
        1,
        5000,
      ),
      aggregateConcurrency: expectNumber(gitlab.aggregateConcurrency, 'gitlab.aggregateConcurrency', 1, 8),
      projects,
    },
    activeProjectId: active.id,
  };
}

export function resolveProject(config: AppConfig, projectKey: string): ConfiguredProject {
  const project = config.gitlab.projects.find((item) => item.id === projectKey);
  if (!project) {
    throw new HttpError(404, 'UNKNOWN_PROJECT', `No configured project with id "${projectKey}".`);
  }
  return project;
}

function parseProjects(value: unknown): ConfiguredProject[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('config gitlab.projects must be a non-empty array.');
  }

  const ids = new Set<string>();
  const projects = value.map((item, index) => {
    const record = expectRecord(item, `gitlab.projects[${index}]`);
    const id = expectString(record.id, `gitlab.projects[${index}].id`);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) {
      throw new Error(`gitlab.projects[${index}].id must be a slug such as emax-web-v2.`);
    }
    if (ids.has(id)) throw new Error(`Duplicate project id "${id}".`);
    ids.add(id);

    const projectPath = expectString(record.path, `gitlab.projects[${index}].path`);
    if (projectPath.startsWith('/') || projectPath.includes('..') || projectPath.includes('\\')) {
      throw new Error(`gitlab.projects[${index}].path must be a GitLab path such as group/project.`);
    }

    return {
      id,
      path: projectPath,
      url: stripTrailingSlash(expectUrl(record.url, `gitlab.projects[${index}].url`)),
      default: record.default === true,
    };
  });

  const defaultCount = projects.filter((project) => project.default).length;
  if (defaultCount > 1) throw new Error('Only one GitLab project can have "default": true.');
  if (defaultCount === 0) projects[0] = { ...projects[0], default: true };
  return projects;
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be a JSON object.`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function expectNumber(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer from ${min} to ${max}.`);
  }
  return value;
}

function expectPort(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error('PORT must be an integer from 1 to 65535.');
  return expectNumber(Number(value), 'PORT', 1, 65535);
}

function expectUrl(value: unknown, label: string): string {
  const text = expectString(value, label);
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`${label} must be an absolute http(s) URL.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${label} must use http or https.`);
  }
  return text;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
