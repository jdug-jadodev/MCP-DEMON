import { promises as fs } from 'fs';
import * as path from 'path';
import type { Config } from '../permissions/config-loader.js';
import { checkPermission } from '../permissions/evaluator.js';

export default async function listDirectoryTool(input: { path: string }, config: Config) {
  if (!input || typeof input.path !== 'string') throw new Error('missing path');
  const resolved = path.resolve(input.path);
  
  // Check permissions before listing
  const permission = await checkPermission(config, resolved, 'list');
  if (!permission.allowed) {
    throw new Error(`Access denied: ${permission.reason}`);
  }
  
  const entries = await fs.readdir(resolved, { withFileTypes: true });
  const results: any[] = [];
  for (const e of entries) {
    try {
      const full = path.join(resolved, e.name);
      const stat = await fs.lstat(full); // use lstat to avoid following broken symlinks
      results.push({
        name: e.name,
        type: e.isDirectory() ? 'directory' : e.isSymbolicLink() ? 'symlink' : 'file',
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        path: full
      });
    } catch {
      // skip entries we can't stat (broken symlinks, permission issues, etc.)
    }
  }
  return { path: resolved, entries: results };
}
