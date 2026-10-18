import type { Express } from 'express';
import type { Dependencies } from '../dependencies.ts';
import { createCoreRouter } from '../routes/core.ts';
import { createReviewCommentsRouter } from './review-comments/routes.ts';

export function registerModules(app: Express, deps: Dependencies): void {
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Add new tool routers here. Each module owns its routes and service.
  app.use('/api', createCoreRouter(deps));
  app.use('/api', createReviewCommentsRouter(deps));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found.' } });
  });
}
