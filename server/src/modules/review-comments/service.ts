import {
  summarizeNotes,
  type CollectCommentsResponse,
  type MergeRequestCommentsResponse,
  type MergeRequestListResponse,
  type MergeRequestStateFilter,
  type ReviewThread,
} from '@gitlab-tools/shared';
import type { TtlCache } from '../../infrastructure/cache.ts';
import type { AppConfig } from '../../infrastructure/config.ts';
import type { ConfiguredProject } from '@gitlab-tools/shared';
import { errorMessage } from '../../infrastructure/httpError.ts';
import { createGitLabClient } from '../../infrastructure/gitlab/projectService.ts';
import { mapMergeRequest } from '../../infrastructure/gitlab/map.ts';
import { mapPool } from '../../infrastructure/pool.ts';
import { mapDiscussions } from './mapper.ts';

interface ListOptions {
  state: MergeRequestStateFilter;
  search?: string;
  refresh: boolean;
}

interface ThreadPage {
  threads: ReviewThread[];
  truncated: boolean;
}

export class ReviewCommentsService {
  constructor(
    private readonly config: AppConfig,
    private readonly cache: TtlCache,
  ) {}

  listMergeRequests(project: ConfiguredProject, options: ListOptions): Promise<MergeRequestListResponse> {
    const search = options.search?.trim() ?? '';
    return this.cached(`mrs:${project.id}:${options.state}:${search}`, options.refresh, async () => {
      const page = await createGitLabClient(this.config, project).listAllMergeRequests({
        state: options.state,
        search: search || undefined,
        maxItems: this.config.gitlab.maxMergeRequests,
      });
      return {
        project,
        mergeRequests: page.items.map((item) => mapMergeRequest(item, this.config.gitlab.baseUrl)),
        total: page.total,
        truncated: page.truncated,
      };
    });
  }

  async getMergeRequestComments(
    project: ConfiguredProject,
    iid: number,
    refresh: boolean,
  ): Promise<MergeRequestCommentsResponse> {
    const [mergeRequest, threadPage] = await Promise.all([
      this.cached(`mr:${project.id}:${iid}`, refresh, async () => {
        const raw = await createGitLabClient(this.config, project).getMergeRequest(iid);
        return mapMergeRequest(raw, this.config.gitlab.baseUrl);
      }),
      this.getThreads(project, iid, refresh),
    ]);

    return {
      mergeRequest,
      threads: threadPage.threads,
      stats: summarizeNotes(threadPage.threads.flatMap((thread) => thread.notes)),
      truncated: threadPage.truncated,
    };
  }

  async collect(project: ConfiguredProject, iids: number[], refresh: boolean): Promise<CollectCommentsResponse> {
    const order = new Map(iids.map((iid, index) => [iid, index]));
    const outcomes = await mapPool(iids, this.config.gitlab.aggregateConcurrency, async (iid) => {
      try {
        const page = await this.getThreads(project, iid, refresh);
        return { ok: true as const, iid, threads: page.threads, truncated: page.truncated };
      } catch (error) {
        return { ok: false as const, iid, message: errorMessage(error) };
      }
    });

    const threads: ReviewThread[] = [];
    const errors: CollectCommentsResponse['errors'] = [];
    const truncatedMergeRequests: number[] = [];

    for (const outcome of outcomes) {
      if (!outcome) continue;
      if (outcome.ok) {
        threads.push(...outcome.threads);
        if (outcome.truncated) truncatedMergeRequests.push(outcome.iid);
      } else {
        errors.push({ iid: outcome.iid, message: outcome.message });
      }
    }

    threads.sort(
      (left, right) => (order.get(left.mergeRequestIid) ?? 0) - (order.get(right.mergeRequestIid) ?? 0),
    );

    return {
      threads,
      stats: summarizeNotes(threads.flatMap((thread) => thread.notes)),
      errors,
      truncatedMergeRequests,
    };
  }

  private getThreads(project: ConfiguredProject, iid: number, refresh: boolean): Promise<ThreadPage> {
    return this.cached(`threads:${project.id}:${iid}`, refresh, async () => {
      const page = await createGitLabClient(this.config, project).listAllDiscussions(
        iid,
        this.config.gitlab.maxDiscussionsPerMergeRequest,
      );
      return {
        threads: mapDiscussions(page.items, iid, mergeRequestUrl(this.config.gitlab.baseUrl, project.path, iid), this.config.gitlab.baseUrl),
        truncated: page.truncated,
      };
    });
  }

  private async cached<T>(key: string, refresh: boolean, load: () => Promise<T>): Promise<T> {
    if (!refresh) {
      const hit = this.cache.get<T>(key);
      if (hit !== undefined) return hit;
    }
    const value = await load();
    this.cache.set(key, value, this.config.cache.ttlSeconds);
    return value;
  }
}

function mergeRequestUrl(baseUrl: string, projectPath: string, iid: number): string {
  return `${baseUrl.replace(/\/+$/, '')}/${projectPath}/-/merge_requests/${iid}`;
}
