import type { ProjectDetails } from '@gitlab-tools/shared';
import type { TtlCache } from '../cache.ts';
import type { AppConfig } from '../config.ts';
import type { ConfiguredProject } from '@gitlab-tools/shared';
import { GitLabClient } from './client.ts';
import { mapProject } from './map.ts';

export function createGitLabClient(config: AppConfig, project: ConfiguredProject): GitLabClient {
  return new GitLabClient({
    baseUrl: config.gitlab.baseUrl,
    token: config.gitlab.token,
    projectPath: project.path,
    perPage: config.gitlab.perPage,
  });
}

export class ProjectService {
  constructor(
    private readonly config: AppConfig,
    private readonly cache: TtlCache,
  ) {}

  async getProject(project: ConfiguredProject, refresh: boolean): Promise<ProjectDetails> {
    const key = `project:${project.id}`;
    if (!refresh) {
      const hit = this.cache.get<ProjectDetails>(key);
      if (hit) return hit;
    }
    const details = mapProject(await createGitLabClient(this.config, project).getProject(), this.config.gitlab.baseUrl);
    this.cache.set(key, details, this.config.cache.ttlSeconds);
    return details;
  }
}
