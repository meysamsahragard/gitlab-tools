import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function findWorkspaceRoot(fromDir = path.dirname(fileURLToPath(import.meta.url))): string {
  let current = fromDir;
  while (true) {
    if (fs.existsSync(path.join(current, 'config', 'default.json'))) return current;
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('Could not find the workspace root (config/default.json).');
    }
    current = parent;
  }
}
