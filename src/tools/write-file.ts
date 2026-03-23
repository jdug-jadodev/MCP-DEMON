import { promises as fs } from 'fs';
import * as path from 'path';
import type { Config } from '../permissions/config-loader.js';
import { checkPermission } from '../permissions/evaluator.js';
import { createBackup, DEFAULT_BACKUP_CONFIG } from '../utils/backup-manager.js';

export default async function writeFileTool(input: { path: string; content: string }, config: Config) {
  if (!input || typeof input.path !== 'string') throw new Error('missing path');
  const resolved = path.resolve(input.path);
  
  // Check permissions before writing
  const permission = await checkPermission(config, resolved, 'write');
  if (!permission.allowed) {
    throw new Error(`Access denied: ${permission.reason}`);
  }
  
  // Create backup before modifying the file
  const backupConfig = {
    ...DEFAULT_BACKUP_CONFIG,
    ...(config.backup || {})
  };
  const backupPath = await createBackup(resolved, backupConfig);
  
  const dir = path.dirname(resolved);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(resolved, input.content ?? '', 'utf8');
  
  return { 
    path: resolved, 
    bytes: Buffer.byteLength(input.content ?? '', 'utf8'),
    backup: backupPath || undefined
  };
}
