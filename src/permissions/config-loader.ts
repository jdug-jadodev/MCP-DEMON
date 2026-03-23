import * as os from 'os';
import * as path from 'path';
import { promises as fs, watch, FSWatcher } from 'fs';
import { EventEmitter } from 'events';

export interface PermissionEntry {
  path: string;
  operations: Array<'read' | 'write' | 'list' | 'search'>;
}

export interface SecurityConfig {
  maxFileSizeBytes: number;
  allowedExtensions: string[];
  logAllAccess: boolean;
  logPath: string;
}

export interface Config {
  version: string;
  permissions: { allowed: PermissionEntry[]; denied: string[] };
  security: SecurityConfig;
}

function defaultConfig(): Config {
  return {
    version: '1.0',
    permissions: { allowed: [], denied: [] },
    security: {
      maxFileSizeBytes: 5242880,
      allowedExtensions: ['.ts', '.js', '.md', '.json', '.txt'],
      logAllAccess: false,
      logPath: path.join(os.homedir(), '.config', 'copilot-fs-mcp', 'logs'),
    },
  };
}

/**
 * Reads config from the given absolute path.
 * Returns default config if file doesn't exist or is invalid.
 */
export async function loadConfig(configPath: string): Promise<Config> {
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    return JSON.parse(raw) as Config;
  } catch {
    return defaultConfig();
  }
}

/**
 * Watches a config file for changes and emits 'change' with the new Config.
 * Usage:
 *   const watcher = watchConfig('/path/to/config.json');
 *   watcher.on('change', (cfg: Config) => { ... });
 *   watcher.stop();  // when done
 */
export class ConfigWatcher extends EventEmitter {
  private fsWatcher: FSWatcher | null = null;
  private debounce: ReturnType<typeof setTimeout> | null = null;
  private configPath: string;

  constructor(configPath: string) {
    super();
    this.configPath = path.resolve(configPath);
  }

  async start() {
    // Emit the initial config
    const cfg = await loadConfig(this.configPath);
    this.emit('change', cfg);

    try {
      this.fsWatcher = watch(this.configPath, (eventType) => {
        if (eventType !== 'change' && eventType !== 'rename') return;
        // Debounce: editors may fire multiple events per save
        if (this.debounce) clearTimeout(this.debounce);
        this.debounce = setTimeout(() => this.reload(), 300);
      });
      this.fsWatcher.on('error', () => {
        // File deleted or inaccessible — keep running with last config
      });
    } catch {
      // watch not supported or file doesn't exist yet — poll every 5s
      this.startPolling();
    }
  }

  private lastMtime = 0;

  private startPolling() {
    const interval = setInterval(async () => {
      try {
        const stat = await fs.stat(this.configPath);
        const mtime = stat.mtimeMs;
        if (mtime !== this.lastMtime) {
          this.lastMtime = mtime;
          await this.reload();
        }
      } catch {
        // file doesn't exist yet — keep polling
      }
    }, 5000);
    // Don't keep process alive just for polling
    interval.unref();
  }

  private async reload() {
    try {
      const cfg = await loadConfig(this.configPath);
      this.emit('change', cfg);
    } catch {
      // bad JSON — ignore, keep last config
    }
  }

  stop() {
    if (this.fsWatcher) {
      this.fsWatcher.close();
      this.fsWatcher = null;
    }
    if (this.debounce) clearTimeout(this.debounce);
  }
}
