import { Router } from 'express';
import type { Dependencies } from '../dependencies.ts';
import { asyncHandler } from '../infrastructure/asyncHandler.ts';
import { resolveProject } from '../infrastructure/config.ts';
import { ProjectService } from '../infrastructure/gitlab/projectService.ts';

export function createCoreRouter(deps: Dependencies): Router {
  const router = Router();
  const projects = new ProjectService(deps.config, deps.cache);

  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'gitlab-tools' });
  });

  router.get('/settings', (_req, res) => {
    res.json({
      gitlabBaseUrl: deps.config.gitlab.baseUrl,
      tokenConfigured: deps.config.gitlab.token.length > 0,
      projects: deps.config.gitlab.projects,
      activeProjectId: deps.config.activeProjectId,
      limits: {
        maxMergeRequests: deps.config.gitlab.maxMergeRequests,
        maxCollectIds: deps.config.gitlab.maxCollectIds,
      },
    });
  });

  router.get(
    '/projects/:projectKey',
    asyncHandler(async (req, res) => {
      const projectKey = Array.isArray(req.params.projectKey) ? req.params.projectKey[0] : req.params.projectKey;
      if (!projectKey) {
        res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing project key.' } });
        return;
      }
      const project = resolveProject(deps.config, projectKey);
      const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
      const details = await projects.getProject(project, refresh);
      res.json(details);
    }),
  );

  return router;
}
