#!/usr/bin/env node
import { Server, startStdioLoop } from './server';
import readFileTool from './tools/read-file';
import writeFileTool from './tools/write-file';
import listDirectoryTool from './tools/list-directory';
import searchFilesTool from './tools/search-files';
import getPermissionsTool from './tools/get-permissions';
import { listBackupsTool, restoreBackupTool } from './tools/backup-tools';
import { ConfigWatcher, type Config } from './permissions/config-loader';
import { configureLogger, info, warn } from './utils/logger';

function getConfigArg(): string | null {
  const idx = process.argv.indexOf('--config');
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

async function main() {
  const configPath = getConfigArg();
  if (!configPath) {
    console.error('Error: debes indicar la ruta del archivo de configuración.');
    console.error('Uso:  copilot-fs-mcp --config /ruta/a/tu/config.json');
    process.exit(1);
  }

  const server = new Server();
  
  // Store current config in memory
  let currentConfig: Config | null = null;

  // register tools with MCP-compliant descriptions and inputSchema
  // All tools now receive the current config
  server.registerTool('read_file', async (input) => {
    if (!currentConfig) throw new Error('Configuration not loaded');
    return readFileTool(input, currentConfig);
  },
    'Read the contents of a file at the given path',
    { type: 'object', properties: { path: { type: 'string', description: 'Absolute path to the file' } }, required: ['path'] }
  );
  
  server.registerTool('write_file', async (input) => {
    if (!currentConfig) throw new Error('Configuration not loaded');
    return writeFileTool(input, currentConfig);
  },
    'Write content to a file, creating directories if needed',
    { type: 'object', properties: { path: { type: 'string', description: 'Absolute path to the file' }, content: { type: 'string', description: 'Content to write' } }, required: ['path', 'content'] }
  );
  
  server.registerTool('list_directory', async (input) => {
    if (!currentConfig) throw new Error('Configuration not loaded');
    return listDirectoryTool(input, currentConfig);
  },
    'List files and folders in a directory',
    { type: 'object', properties: { path: { type: 'string', description: 'Absolute path to the directory' } }, required: ['path'] }
  );
  
  server.registerTool('search_files', async (input) => {
    if (!currentConfig) throw new Error('Configuration not loaded');
    return searchFilesTool(input, currentConfig);
  },
    'Search for files by name pattern or content',
    { type: 'object', properties: { rootPath: { type: 'string', description: 'Root directory to search in' }, pattern: { type: 'string', description: 'Glob pattern for filenames' }, searchContent: { type: 'string', description: 'Optional text to search inside files' } }, required: ['rootPath', 'pattern'] }
  );
  
  server.registerTool('get_permissions', async (input) => {
    if (!currentConfig) throw new Error('Configuration not loaded');
    return getPermissionsTool(input, currentConfig);
  },
    'Show current permission configuration',
    { type: 'object', properties: {} }
  );

  server.registerTool('list_backups', async (input) => {
    if (!currentConfig) throw new Error('Configuration not loaded');
    return listBackupsTool(input, currentConfig);
  },
    'List all available backups for a file',
    { type: 'object', properties: { path: { type: 'string', description: 'Absolute path to the file' } }, required: ['path'] }
  );

  server.registerTool('restore_backup', async (input) => {
    if (!currentConfig) throw new Error('Configuration not loaded');
    return restoreBackupTool(input, currentConfig);
  },
    'Restore a file from a backup (default: most recent)',
    { type: 'object', properties: { path: { type: 'string', description: 'Absolute path to the file' }, backupIndex: { type: 'number', description: 'Index of backup to restore (0 = most recent)' } }, required: ['path'] }
  );

  // Watch config — auto-reloads on changes
  const watcher = new ConfigWatcher(configPath);
  watcher.on('change', async (cfg) => {
    currentConfig = cfg; // Update the config in memory
    try {
      await configureLogger({ logPath: cfg.security.logPath, stderr: true });
    } catch {}
    server.emit('config.loaded', cfg);
    info('config loaded/reloaded from', configPath);
  });
  await watcher.start();

  startStdioLoop(server);

  process.on('uncaughtException', (err) => {
    console.error('uncaughtException', err);
  });
}

main().catch((err) => {
  console.error('startup error', err);
  process.exit(1);
});
