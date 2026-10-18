import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaults = JSON.parse(fs.readFileSync(path.join(root, 'config', 'default.json'), 'utf8')) as {
  server?: { port?: number };
};
const envPort = readEnvPort(path.join(root, '.env'));
const port = Number(process.env.PORT) || envPort || defaults.server?.port || 3001;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${port}`,
        changeOrigin: true,
      },
    },
  },
});

function readEnvPort(envPath: string): number | undefined {
  if (!fs.existsSync(envPath)) return undefined;
  const match = fs.readFileSync(envPath, 'utf8').match(/^\s*PORT\s*=\s*(\d+)\s*$/m);
  return match ? Number(match[1]) : undefined;
}
