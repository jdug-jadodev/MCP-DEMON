import type { ParseableConfig } from '../../permissions/config-loader.js';

export interface ZipParseResult {
  format: 'zip';
  totalFiles: number;
  files: string[];
  textFiles: Record<string, string>;
  truncated: boolean;
}

// Extensions considered readable as text
const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.cs', '.php',
  '.sh', '.bat', '.ps1', '.lua', '.dart', '.swift', '.kt', '.r', '.sql',
  '.md', '.txt', '.json', '.yaml', '.yml', '.toml', '.ini', '.env',
  '.xml', '.html', '.htm', '.css', '.scss', '.less', '.svg',
  '.csv', '.log', '.conf', '.config', '.gitignore', '.editorconfig',
  '.dockerfile', '', // no extension = likely text
]);

function isTextEntry(name: string): boolean {
  const ext = name.includes('.') ? '.' + name.split('.').pop()!.toLowerCase() : '';
  return TEXT_EXTENSIONS.has(ext);
}

export async function parseZip(buf: Buffer, options?: ParseableConfig): Promise<ZipParseResult> {
  const AdmZip = (await import('adm-zip')).default;
  const maxFiles = options?.maxZipFiles ?? 100;

  const zip = new AdmZip(buf);
  const entries = zip.getEntries().filter((e) => !e.isDirectory);

  const allFiles = entries.map((e) => e.entryName);
  const truncated = allFiles.length > maxFiles;
  const limitedEntries = entries.slice(0, maxFiles);

  const textFiles: Record<string, string> = {};
  for (const entry of limitedEntries) {
    if (isTextEntry(entry.name)) {
      try {
        const content = entry.getData().toString('utf8');
        // Only include if it looks like valid text (no NUL bytes)
        if (!content.includes('\0')) {
          textFiles[entry.entryName] = content;
        }
      } catch {
        // Skip unreadable entries
      }
    }
  }

  return {
    format: 'zip',
    totalFiles: allFiles.length,
    files: allFiles,
    textFiles,
    truncated,
  };
}
