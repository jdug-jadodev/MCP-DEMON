import * as path from 'path';
import type { Config } from '../permissions/config-loader.js';
import { checkPermission } from '../permissions/evaluator.js';
import { listBackups, restoreBackup, DEFAULT_BACKUP_CONFIG } from '../utils/backup-manager.js';

/**
 * Lists available backups for a file
 */
export async function listBackupsTool(
  input: { path: string },
  config: Config
) {
  if (!input || typeof input.path !== 'string') {
    throw new Error('missing path');
  }

  const resolved = path.resolve(input.path);

  // Check read permissions for the file
  const permission = await checkPermission(config, resolved, 'read');
  if (!permission.allowed) {
    throw new Error(`Access denied: ${permission.reason}`);
  }

  const backupConfig = {
    ...DEFAULT_BACKUP_CONFIG,
    ...(config.backup || {})
  };

  const backups = await listBackups(resolved, backupConfig);

  return {
    file: resolved,
    backups: backups.map((b, index) => ({
      index,
      path: b.path,
      timestamp: b.timestamp.toISOString(),
      size: b.size,
      ageMinutes: Math.floor((Date.now() - b.timestamp.getTime()) / 60000)
    }))
  };
}

/**
 * Restores a file from a backup
 */
export async function restoreBackupTool(
  input: { path: string; backupIndex?: number },
  config: Config
) {
  if (!input || typeof input.path !== 'string') {
    throw new Error('missing path');
  }

  const resolved = path.resolve(input.path);

  // Check write permissions for the target file
  const permission = await checkPermission(config, resolved, 'write');
  if (!permission.allowed) {
    throw new Error(`Access denied: ${permission.reason}`);
  }

  const backupConfig = {
    ...DEFAULT_BACKUP_CONFIG,
    ...(config.backup || {})
  };

  const backups = await listBackups(resolved, backupConfig);

  if (backups.length === 0) {
    throw new Error('No backups found for this file');
  }

  // Default to most recent backup (index 0)
  const backupIndex = input.backupIndex ?? 0;

  if (backupIndex < 0 || backupIndex >= backups.length) {
    throw new Error(`Invalid backup index. Available: 0-${backups.length - 1}`);
  }

  const backup = backups[backupIndex];
  await restoreBackup(backup.path, resolved);

  return {
    restored: resolved,
    from: backup.path,
    timestamp: backup.timestamp.toISOString()
  };
}
