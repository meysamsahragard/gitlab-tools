import { Router } from 'express';
import type { MergeRequestStateFilter } from '@gitlab-tools/shared';
import type { Dependencies } from '../../dependencies.ts';
import { asyncHandler } from '../../infrastructure/asyncHandler.ts';
import { HttpError } from '../../infrastructure/httpError.ts';
import { resolveProject } from '../../infrastructure/config.ts';
import { ReviewCommentsService } from './service.ts';

const STATES = new Set<MergeRequestStateFilter>(['opened', 'closed', 'merged', 'locked', 'all']);

export function createReviewCommentsRouter(deps: Dependencies): Router {
  const router = Router();
  const service = new ReviewCommentsService(deps.config, deps.cache);

  router.get(
    '/projects/:projectKey/merge-requests',
    asyncHandler(async (req, res) => {
      const project = resolveProject(deps.config, routeParam(req.params.projectKey));
      const result = await service.listMergeRequests(project, {
        state: parseState(req.query.state),
        search: parseSearch(req.query.search),
        refresh: parseRefresh(req.query.refresh),
      });
      res.json(result);
    }),
  );

  router.get(
    '/projects/:projectKey/merge-requests/:iid/comments',
    asyncHandler(async (req, res) => {
      const project = resolveProject(deps.config, routeParam(req.params.projectKey));
      const result = await service.getMergeRequestComments(
        project,
        parseIid(routeParam(req.params.iid)),
        parseRefresh(req.query.refresh),
      );
      res.json(result);
    }),
  );

  router.post(
    '/projects/:projectKey/review-comments',
    asyncHandler(async (req, res) => {
      const project = resolveProject(deps.config, routeParam(req.params.projectKey));
      const body = parseCollectBody(req.body, deps.config.gitlab.maxCollectIds);
      const result = await service.collect(project, body.iids, body.refresh);
      res.json(result);
    }),
  );

  return router;
}

function routeParam(value: string | string[] | undefined): string {
  const text = Array.isArray(value) ? value[0] : value;
  if (!text) throw new HttpError(400, 'BAD_REQUEST', 'Missing route parameter.');
  return text;
}

function parseIid(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new HttpError(400, 'BAD_REQUEST', 'Merge request iid must be a positive integer.');
  }
  return Number(value);
}

function parseState(value: unknown): MergeRequestStateFilter {
  const text = firstString(value) ?? 'opened';
  if (!STATES.has(text as MergeRequestStateFilter)) {
    throw new HttpError(400, 'BAD_REQUEST', 'state must be opened, closed, merged, locked, or all.');
  }
  return text as MergeRequestStateFilter;
}

function parseSearch(value: unknown): string | undefined {
  const text = firstString(value)?.trim();
  if (!text) return undefined;
  if (text.length > 200) throw new HttpError(400, 'BAD_REQUEST', 'search must be 200 characters or fewer.');
  return text;
}

function parseRefresh(value: unknown): boolean {
  const text = firstString(value);
  return text === '1' || text === 'true';
}

function parseCollectBody(body: unknown, maxIds: number): { iids: number[]; refresh: boolean } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'BAD_REQUEST', 'Expected a JSON object.');
  }
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.iids)) {
    throw new HttpError(400, 'BAD_REQUEST', 'iids must be an array of merge request numbers.');
  }
  if (record.iids.length > maxIds) {
    throw new HttpError(400, 'BAD_REQUEST', `Collect at most ${maxIds} merge requests per request.`);
  }

  const iids: number[] = [];
  for (const value of record.iids) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      throw new HttpError(400, 'BAD_REQUEST', 'Each iid must be a positive integer.');
    }
    if (!iids.includes(value)) iids.push(value);
  }

  return { iids, refresh: record.refresh === true };
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}
