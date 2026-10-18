import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import { findWorkspaceRoot } from './root.ts';
import { loadConfig } from './config.ts';

test('default config points at emax-web-v2', () => {
  const previous = {
    token: process.env.GITLAB_TOKEN,
    base: process.env.GITLAB_BASE_URL,
    port: process.env.PORT,
    origin: process.env.CLIENT_ORIGIN,
    host: process.env.HOST,
  };

  process.env.GITLAB_TOKEN = 'test-token';
  delete process.env.GITLAB_BASE_URL;
  delete process.env.PORT;
  delete process.env.CLIENT_ORIGIN;
  delete process.env.HOST;

  try {
    const root = findWorkspaceRoot(path.dirname(fileURLToPath(import.meta.url)));
    const config = loadConfig(root);
    assert.equal(config.gitlab.baseUrl, 'http://gitlab.corp.mabnadp.com');
    assert.equal(config.activeProjectId, 'emax-web-v2');
    assert.equal(config.gitlab.projects[0]?.path, 'mabna/emax-web-v2');
    assert.equal(config.gitlab.projects[0]?.url, 'http://gitlab.corp.mabnadp.com/mabna/emax-web-v2');
    assert.equal(config.gitlab.token, 'test-token');
    assert.equal(config.server.port, 3001);
  } finally {
    restore('GITLAB_TOKEN', previous.token);
    restore('GITLAB_BASE_URL', previous.base);
    restore('PORT', previous.port);
    restore('CLIENT_ORIGIN', previous.origin);
    restore('HOST', previous.host);
  }
});

function restore(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
