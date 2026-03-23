import { promises as fs } from 'fs';
import * as path from 'path';

interface BackupConfig {
  enabled: boolean;
  maxBackups: number; // Maximum number of backups to keep per file
  backupDir: string;  // Relative to workspace root
}

export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  enabled: true,
  maxBackups: 10,
  backupDir: '.mcp-backups'
};

/**
 * Creates a backup of a file before it's modified
 * @param filePath - Absolute path to the file to backup
 * @param config - Backup configuration
 * @returns Path to the created backup file, or null if backup is disabled
 */
export async function createBackup(
  filePath: string, 
  config: BackupConfig = DEFAULT_BACKUP_CONFIG
): Promise<string | null> {
  if (!config.enabled) {
    return null;
  }

  try {
    // Check if file exists before backing up
    await fs.access(filePath);
  } catch {
    // File doesn't exist, no need to backup
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const basename = path.basename(filePath);
  const dirname = path.dirname(filePath);
  
  // Create backup directory structure that mirrors the original
  const backupRoot = path.join(process.cwd(), config.backupDir);
  const relativePath = path.relative(process.cwd(), dirname);
  const backupDir = path.join(backupRoot, relativePath);
  
  await fs.mkdir(backupDir, { recursive: true });
  
  // Create backup filename with timestamp
  const backupFileName = `${basename}.${timestamp}.backup`;
  const backupPath = path.join(backupDir, backupFileName);
  
  // Copy the file
  await fs.copyFile(filePath, backupPath);
  
  // Clean old backups
  await cleanOldBackups(filePath, config);
  
  return backupPath;
}

/**
 * Removes old backups keeping only the most recent maxBackups files
 */
async function cleanOldBackups(
  originalPath: string, 
  config: BackupConfig
): Promise<void> {
  if (config.maxBackups <= 0) return;

  const basename = path.basename(originalPath);
  const dirname = path.dirname(originalPath);
  const backupRoot = path.join(process.cwd(), config.backupDir);
  const relativePath = path.relative(process.cwd(), dirname);
  const backupDir = path.join(backupRoot, relativePath);

  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(f => f.startsWith(basename + '.') && f.endsWith('.backup'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        stat: null as any
      }));

    // Get stats for all backup files
    for (const file of backupFiles) {
      file.stat = await fs.stat(file.path);
    }

    // Sort by modification time (newest first)
    backupFiles.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

    // Remove oldest backups beyond maxBackups
    const toDelete = backupFiles.slice(config.maxBackups);
    for (const file of toDelete) {
      await fs.unlink(file.path);
    }
  } catch (error) {
    // Directory might not exist yet, ignore
  }
}

/**
 * Lists all backups for a given file
 */
export async function listBackups(
  filePath: string,
  config: BackupConfig = DEFAULT_BACKUP_CONFIG
): Promise<Array<{ path: string; timestamp: Date; size: number }>> {
  const basename = path.basename(filePath);
  const dirname = path.dirname(filePath);
  const backupRoot = path.join(process.cwd(), config.backupDir);
  const relativePath = path.relative(process.cwd(), dirname);
  const backupDir = path.join(backupRoot, relativePath);

  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(f => f.startsWith(basename + '.') && f.endsWith('.backup'));

    const backups = await Promise.all(
      backupFiles.map(async (f) => {
        const fullPath = path.join(backupDir, f);
        const stat = await fs.stat(fullPath);
        return {
          path: fullPath,
          timestamp: stat.mtime,
          size: stat.size
        };
      })
    );

    // Sort by timestamp (newest first)
    return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    return [];
  }
}

/**
 * Restores a file from a backup
 */
export async function restoreBackup(
  backupPath: string,
  targetPath: string
): Promise<void> {
  await fs.copyFile(backupPath, targetPath);
}
