import { promises as fs } from 'fs';
import * as path from 'path';

export default async function writeFileTool(input: { path: string; content: string }) {
  if (!input || typeof input.path !== 'string') throw new Error('missing path');
  const resolved = path.resolve(input.path);
  const dir = path.dirname(resolved);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(resolved, input.content ?? '', 'utf8');
  return { path: resolved, bytes: Buffer.byteLength(input.content ?? '', 'utf8') };
}
