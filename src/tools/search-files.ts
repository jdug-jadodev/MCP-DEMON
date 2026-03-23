import * as path from 'path';
import { glob } from 'glob';
import { promises as fs } from 'fs';
import type { Config } from '../permissions/config-loader.js';
import { checkPermission } from '../permissions/evaluator.js';

export default async function searchFilesTool(input: { rootPath: string; pattern?: string; searchContent?: string }, config: Config) {
  const root = path.resolve(input.rootPath || '.');
  
  // Check permissions before searching
  const permission = await checkPermission(config, root, 'search');
  if (!permission.allowed) {
    throw new Error(`Access denied: ${permission.reason}`);
  }
  
  const pattern = input.pattern || '**/*';
  const matches = await glob(pattern, { cwd: root, absolute: true, nodir: true });
  let results = matches.slice(0, 100);
  if (input.searchContent) {
    const filtered: string[] = [];
    for (const f of results) {
      try {
        const c = await fs.readFile(f, 'utf8');
        if (c.includes(input.searchContent!)) filtered.push(f);
      } catch (_) {}
    }
    results = filtered.slice(0, 100);
  }
  return { root, results };
}
