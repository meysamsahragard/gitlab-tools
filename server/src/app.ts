import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import type { Dependencies } from './dependencies.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { registerModules } from './modules/register.ts';

export function createApp(deps: Dependencies): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: deps.config.server.clientOrigin }));
  app.use(express.json({ limit: '1mb' }));
  registerModules(app, deps);
  serveClient(app, deps.rootDir);
  app.use((_req, res) => {
    res.status(404).type('text/plain').send('Not found. Start the web app with npm run dev, or build the client.');
  });
  app.use(errorHandler);
  return app;
}

function serveClient(app: express.Express, rootDir: string): void {
  const dist = path.join(rootDir, 'client', 'dist');
  const indexFile = path.join(dist, 'index.html');
  if (!fs.existsSync(indexFile)) return;

  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(indexFile);
  });
}
