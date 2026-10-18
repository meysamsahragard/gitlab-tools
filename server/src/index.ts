import path from 'node:path';
import dotenv from 'dotenv';
import { createApp } from './app.ts';
import { TtlCache } from './infrastructure/cache.ts';
import { loadConfig } from './infrastructure/config.ts';
import { findWorkspaceRoot } from './infrastructure/root.ts';

const rootDir = findWorkspaceRoot();
const envPath = path.join(rootDir, '.env');
const envFile = dotenv.config({ path: envPath });
if (envFile.error) {
  console.log(`No .env file at ${envPath}`);
} else {
  console.log(`Loaded .env from ${envPath}`);
}

const config = loadConfig(rootDir);
const app = createApp({
  config,
  cache: new TtlCache(),
  rootDir,
});

const server = app.listen(config.server.port, config.server.host, () => {
  console.log(`GitLab Tools API http://${config.server.host}:${config.server.port}`);
  console.log(`GitLab ${config.gitlab.baseUrl}`);
  for (const project of config.gitlab.projects) {
    const marker = project.default ? ' (default)' : '';
    console.log(`Project ${project.path} ${project.url}${marker}`);
  }
  console.log(config.gitlab.token ? 'Token configured' : 'Token missing — set GITLAB_TOKEN in .env');
});

server.requestTimeout = 0;

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.server.port} is already in use.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});
