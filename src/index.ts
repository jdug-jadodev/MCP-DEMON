#!/usr/bin/env node
import { Server, startStdioLoop } from './server';
import readFileTool from './tools/read-file';
import writeFileTool from './tools/write-file';
import listDirectoryTool from './tools/list-directory';
import searchFilesTool from './tools/search-files';
import getPermissionsTool from './tools/get-permissions';
import { ConfigWatcher } from './permissions/config-loader';
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

  // register tools with MCP-compliant descriptions and inputSchema
  server.registerTool('read_file', async (input) => readFileTool(input),
    'Read the contents of a file at the given path',
    { type: 'object', properties: { path: { type: 'string', description: 'Absolute path to the file' } }, required: ['path'] }
  );
  server.registerTool('write_file', async (input) => writeFileTool(input),
    'Write content to a file, creating directories if needed',
    { type: 'object', properties: { path: { type: 'string', description: 'Absolute path to the file' }, content: { type: 'string', description: 'Content to write' } }, required: ['path', 'content'] }
  );
  server.registerTool('list_directory', async (input) => listDirectoryTool(input),
    'List files and folders in a directory',
    { type: 'object', properties: { path: { type: 'string', description: 'Absolute path to the directory' } }, required: ['path'] }
  );
  server.registerTool('search_files', async (input) => searchFilesTool(input),
    'Search for files by name pattern or content',
    { type: 'object', properties: { rootPath: { type: 'string', description: 'Root directory to search in' }, pattern: { type: 'string', description: 'Glob pattern for filenames' }, searchContent: { type: 'string', description: 'Optional text to search inside files' } }, required: ['rootPath', 'pattern'] }
  );
  server.registerTool('get_permissions', async () => getPermissionsTool(),
    'Show current permission configuration',
    { type: 'object', properties: {} }
  );

  // Watch config — auto-reloads on changes
  const watcher = new ConfigWatcher(configPath);
  watcher.on('change', async (cfg) => {
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
