import { HttpError } from '../httpError.ts';
import type { GitLabDiscussion, GitLabMergeRequest, GitLabProject } from './types.ts';

interface GitLabClientOptions {
  baseUrl: string;
  token: string;
  projectPath: string;
  perPage: number;
}

type Query = Record<string, string | number | boolean | undefined>;

interface Page<T> {
  items: T[];
  total: number | null;
  truncated: boolean;
}

export class GitLabClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly projectPath: string;
  private readonly perPage: number;

  constructor(options: GitLabClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.projectPath = options.projectPath;
    this.perPage = options.perPage;
  }

  getProject(): Promise<GitLabProject> {
    return this.getObject<GitLabProject>(`/projects/${this.projectSegment()}`);
  }

  getMergeRequest(iid: number): Promise<GitLabMergeRequest> {
    return this.getObject<GitLabMergeRequest>(`/projects/${this.projectSegment()}/merge_requests/${iid}`);
  }

  listAllMergeRequests(options: {
    state: string;
    search?: string;
    maxItems: number;
  }): Promise<Page<GitLabMergeRequest>> {
    return this.getAll<GitLabMergeRequest>(`/projects/${this.projectSegment()}/merge_requests`, {
      state: options.state,
      scope: 'all',
      search: options.search,
      order_by: 'updated_at',
      sort: 'desc',
    }, options.maxItems);
  }

  listAllDiscussions(iid: number, maxItems: number): Promise<Page<GitLabDiscussion>> {
    return this.getAll<GitLabDiscussion>(
      `/projects/${this.projectSegment()}/merge_requests/${iid}/discussions`,
      {},
      maxItems,
    );
  }

  private projectSegment(): string {
    return encodeURIComponent(this.projectPath);
  }

  private async getObject<T>(pathname: string): Promise<T> {
    const { payload } = await this.request(pathname);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new HttpError(502, 'GITLAB_BAD_RESPONSE', 'GitLab returned an unexpected payload.');
    }
    return payload as T;
  }

  private async getAll<T>(pathname: string, query: Query, maxItems: number): Promise<Page<T>> {
    const items: T[] = [];
    let page = 1;
    let total: number | null = null;
    let truncated = false;

    while (page <= 100 && items.length < maxItems) {
      const { payload, headers } = await this.request(pathname, {
        ...query,
        page,
        per_page: this.perPage,
      });
      if (!Array.isArray(payload)) {
        throw new HttpError(502, 'GITLAB_BAD_RESPONSE', 'GitLab returned an unexpected list.');
      }

      const headerTotal = Number(headers.get('x-total'));
      if (Number.isFinite(headerTotal)) total = headerTotal;

      const next = headers.get('x-next-page');
      for (const item of payload) {
        if (items.length >= maxItems) {
          truncated = true;
          break;
        }
        items.push(item as T);
      }

      if (items.length >= maxItems && next) truncated = true;
      if (truncated || !next) break;
      const nextPage = Number(next);
      if (!Number.isFinite(nextPage) || nextPage <= page) break;
      page = nextPage;
    }

    return { items, total, truncated };
  }

  private async request(pathname: string, query?: Query): Promise<{ payload: unknown; headers: Headers }> {
    if (!this.token) {
      throw new HttpError(
        503,
        'TOKEN_MISSING',
        'Set GITLAB_TOKEN in the workspace .env file. The token needs the read_api scope.',
      );
    }

    const url = `${this.baseUrl}/api/v4${pathname}${toQuery(query)}`;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            'PRIVATE-TOKEN': this.token,
            Accept: 'application/json',
            'User-Agent': 'gitlab-tools',
          },
          signal: AbortSignal.timeout(30_000),
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'network error';
        throw new HttpError(502, 'GITLAB_UNREACHABLE', `Could not reach GitLab at ${this.baseUrl}. ${detail}`);
      }

      if ((response.status === 429 || response.status >= 500) && attempt === 0) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 750;
        await delay(waitMs);
        continue;
      }

      const text = await response.text();
      const payload = parseJson(text);
      if (!response.ok) {
        throw gitlabError(response.status, payload, this.projectPath);
      }
      return { payload, headers: response.headers };
    }

    throw new HttpError(502, 'GITLAB_UNAVAILABLE', 'GitLab did not return a successful response.');
  }
}

function toQuery(query: Query | undefined): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function gitlabError(status: number, payload: unknown, projectPath: string): HttpError {
  const gitlabMessage = readGitlabMessage(payload);
  if (status === 401) {
    return new HttpError(
      401,
      'GITLAB_UNAUTHORIZED',
      `GitLab rejected the token. Check GITLAB_TOKEN and that it includes the read_api scope.${suffix(gitlabMessage)}`,
    );
  }
  if (status === 403) {
    return new HttpError(
      403,
      'GITLAB_FORBIDDEN',
      `The token cannot read ${projectPath}. Confirm that account can access the project.${suffix(gitlabMessage)}`,
    );
  }
  if (status === 404) {
    return new HttpError(
      404,
      'GITLAB_NOT_FOUND',
      `GitLab could not find ${projectPath} or the requested merge request.${suffix(gitlabMessage)}`,
    );
  }
  return new HttpError(
    status >= 400 && status < 500 ? status : 502,
    'GITLAB_ERROR',
    gitlabMessage || `GitLab returned status ${status}.`,
  );
}

function readGitlabMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as Record<string, unknown>;
  if (typeof record.message === 'string') return record.message.slice(0, 300);
  if (typeof record.error === 'string') return record.error.slice(0, 300);
  if (record.message && typeof record.message === 'object') return JSON.stringify(record.message).slice(0, 300);
  return '';
}

function suffix(message: string): string {
  return message ? ` ${message}` : '';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
