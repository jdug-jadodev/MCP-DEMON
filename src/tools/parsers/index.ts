import * as path from 'path';
import type { ParseableConfig } from '../../permissions/config-loader.js';
import { parsePdf } from './pdf-parser.js';
import { parseDocx } from './docx-parser.js';
import { parseExcel } from './excel-parser.js';
import { parseCsv } from './csv-parser.js';
import { parsePptx } from './pptx-parser.js';
import { parseImage } from './image-parser.js';
import { parseZip } from './zip-parser.js';

export type ParsedResult =
  | Awaited<ReturnType<typeof parsePdf>>
  | Awaited<ReturnType<typeof parseDocx>>
  | Awaited<ReturnType<typeof parseExcel>>
  | Awaited<ReturnType<typeof parseCsv>>
  | Awaited<ReturnType<typeof parsePptx>>
  | Awaited<ReturnType<typeof parseImage>>
  | Awaited<ReturnType<typeof parseZip>>;

export interface ExtractOptions {
  maxPages?: number;
  sheetNames?: string[];
  ocrEnabled?: boolean;
  ocrTimeoutMs?: number;
  maxRows?: number;
  maxFiles?: number;
}

/** Returns true if the extension has a dedicated parser */
export function hasParser(ext: string): boolean {
  return PARSEABLE_EXTENSIONS.has(ext.toLowerCase());
}

export const PARSEABLE_EXTENSIONS = new Set([
  // Documents
  '.pdf',
  '.docx', '.doc',
  '.xlsx', '.xls',
  '.pptx',
  // Data
  '.csv',
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.svg',
  // Archives
  '.zip',
]);

/**
 * Routes a file buffer to the correct parser based on its extension.
 * Returns null if no parser is available (caller should fall back to text or base64).
 */
export async function parseFile(
  buf: Buffer,
  filePath: string,
  config?: ParseableConfig,
  overrides?: ExtractOptions
): Promise<ParsedResult | null> {
  const ext = path.extname(filePath).toLowerCase();

  // Merge base config with per-call overrides
  const defaults: ParseableConfig = {
    maxPdfPages: 50,
    maxExcelRows: 5000,
    maxZipFiles: 100,
    imageBase64: true,
    ocrEnabled: false,
    ocrTimeoutMs: 30000,
  };
  const merged: ParseableConfig = {
    ...defaults,
    ...config,
    ...(overrides?.maxPages     !== undefined && { maxPdfPages:  overrides.maxPages }),
    ...(overrides?.maxRows      !== undefined && { maxExcelRows: overrides.maxRows }),
    ...(overrides?.maxFiles     !== undefined && { maxZipFiles:  overrides.maxFiles }),
    ...(overrides?.ocrEnabled   !== undefined && { ocrEnabled:   overrides.ocrEnabled }),
    ...(overrides?.ocrTimeoutMs !== undefined && { ocrTimeoutMs: overrides.ocrTimeoutMs }),
  };

  switch (ext) {
    case '.pdf':
      return parsePdf(buf, merged);

    case '.docx':
    case '.doc':
      return parseDocx(buf);

    case '.xlsx':
    case '.xls':
      return parseExcel(buf, ext, merged);

    case '.csv':
      return parseCsv(buf, merged.maxExcelRows);

    case '.pptx':
      return parsePptx(buf);

    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.webp':
    case '.bmp':
    case '.tiff':
    case '.tif':
    case '.svg':
      return parseImage(buf, ext, {
        ocrEnabled:   merged.ocrEnabled,
        ocrTimeoutMs: merged.ocrTimeoutMs,
      });

    case '.zip':
      return parseZip(buf, merged);

    default:
      return null;
  }
}
