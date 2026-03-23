import { promises as fs } from 'fs';
import * as path from 'path';

export default async function readFileTool(input: { path: string }) {
  if (!input || typeof input.path !== 'string') throw new Error('missing path');
  const resolved = path.resolve(input.path);
  const content = await fs.readFile(resolved, 'utf8');
  return { path: resolved, content };
}
