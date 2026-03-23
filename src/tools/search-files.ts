import * as path from 'path';
import { glob } from 'glob';
import { promises as fs } from 'fs';

export default async function searchFilesTool(input: { rootPath: string; pattern?: string; searchContent?: string }) {
  const root = path.resolve(input.rootPath || '.');
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
