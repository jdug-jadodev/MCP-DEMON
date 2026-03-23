import { promises as fs } from 'fs';
import * as path from 'path';
import type { Config } from '../permissions/config-loader.js';
import { checkPermission } from '../permissions/evaluator.js';

export default async function readFileTool(input: { path: string }, config: Config) {
  if (!input || typeof input.path !== 'string') throw new Error('missing path');
  const resolved = path.resolve(input.path);
  
  // Check permissions before reading
  const permission = await checkPermission(config, resolved, 'read');
  if (!permission.allowed) {
    throw new Error(`Access denied: ${permission.reason}`);
  }
  
  const content = await fs.readFile(resolved, 'utf8');
  return { path: resolved, content };
}
