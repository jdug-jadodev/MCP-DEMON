import * as os from 'os';
import * as path from 'path';
import { promises as fs, watch, FSWatcher } from 'fs';
import { EventEmitter } from 'events';
import { z } from 'zod';

/**
 * Zod Schema for Permission Entry
 * Validates that each entry has a valid path and at least one operation
 */
const PermissionEntrySchema = z.object({
  path: z.string().min(1, 'Path cannot be empty'),
  operations: z.array(z.enum(['read', 'write', 'list', 'search'])).min(1, 'At least one operation must be specified'),
});

/**
 * Zod Schema for Parseable Configuration
 * Controls parser behaviour for documents, images and archives
 */
const ParseableConfigSchema = z.object({
  maxPdfPages: z.number().positive().default(50),
  maxExcelRows: z.number().positive().default(5000),
  maxZipFiles: z.number().positive().default(100),
  imageBase64: z.boolean().default(true),
  ocrEnabled: z.boolean().default(false),
  ocrTimeoutMs: z.number().positive().default(30000),
}).optional();

/**
 * Zod Schema for Security Configuration
 * Validates all security-related settings
 */
const SecurityConfigSchema = z.object({
  maxFileSizeBytes: z.number().positive('maxFileSizeBytes must be positive'),
  allowedExtensions: z.array(z.string()),
  binaryExtensions: z.array(z.string()).optional(),
  logAllAccess: z.boolean(),
  logPath: z.string().min(1, 'logPath cannot be empty'),
  parseable: ParseableConfigSchema,
});

/**
 * Zod Schema for Backup Configuration
 * Validates backup-related settings
 */
const BackupConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxBackups: z.number().positive('maxBackups must be positive').default(10),
  backupDir: z.string().default('.mcp-backups'),
}).optional();

/**
 * Zod Schema for Complete Configuration
 * Validates the entire config.json structure
 */
const ConfigSchema = z.object({
  version: z.string().min(1, 'Version is required'),
  permissions: z.object({
    allowed: z.array(PermissionEntrySchema),
    denied: z.array(z.string()),
  }),
  security: SecurityConfigSchema,
  backup: BackupConfigSchema,
});

/**
 * TypeScript types inferred from Zod schemas
 * These ensure type safety throughout the application
 */
export type PermissionEntry = z.infer<typeof PermissionEntrySchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
export type BackupConfig = z.infer<typeof BackupConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;
export type ParseableConfig = NonNullable<z.infer<typeof ParseableConfigSchema>>;

/**
 * Export schemas for external validation if needed
 */
export { ConfigSchema, PermissionEntrySchema, SecurityConfigSchema, BackupConfigSchema, ParseableConfigSchema };

/**
 * Gets the default config path based on the operating system.
 * 
 * @returns Absolute path to config.json
 * - Windows: %APPDATA%\copilot-fs-mcp\config.json
 * - macOS/Linux: ~/.config/copilot-fs-mcp/config.json
 */
export function getConfigPath(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'copilot-fs-mcp', 'config.json');
  } else {
    return path.join(os.homedir(), '.config', 'copilot-fs-mcp', 'config.json');
  }
}

/**
 * Returns a default configuration with safe defaults.
 * Used when config file doesn't exist or is invalid.
 */
function defaultConfig(): Config {
  return {
    version: '1.0',
    permissions: { 
      allowed: [], 
      denied: ['~/.ssh', '~/.aws', '~/.config/secrets'] // Safe defaults
    },
    security: {
      maxFileSizeBytes: 5242880, // 5 MB
      allowedExtensions: ['.ts', '.js', '.md', '.json', '.txt', '.tsx', '.jsx', '.css', '.html', '.yml', '.yaml'],
      binaryExtensions: [],
      logAllAccess: false,
      logPath: path.join(os.homedir(), '.config', 'copilot-fs-mcp', 'logs'),
    },
  };
}

/**
 * Reads and validates config from the given absolute path.
 * Applies Zod schema validation to ensure config integrity.
 * Returns default config if file doesn't exist.
 * Throws descriptive error if config is malformed.
 * 
 * @param configPath - Absolute path to config.json
 * @returns Validated Config object
 * @throws Error with detailed validation errors if config is invalid
 */
export async function loadConfig(configPath: string): Promise<Config> {
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    const rawJson = JSON.parse(raw);
    
    // Apply Zod validation
    const result = ConfigSchema.safeParse(rawJson);
    
    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.issues.map((err: any) => 
        `  - ${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(`Invalid config.json:\n${errorMessages}`);
    }
    
    return result.data;
  } catch (error) {
    // If file doesn't exist, return default config
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return defaultConfig();
    }
    
    // Re-throw validation errors and JSON parse errors
    throw error;
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
