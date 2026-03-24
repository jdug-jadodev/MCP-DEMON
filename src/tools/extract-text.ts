import { promises as fs } from 'fs';
import * as path from 'path';
import type { Config } from '../permissions/config-loader.js';
import { checkPermission } from '../permissions/evaluator.js';
import { parseFile, hasParser, PARSEABLE_EXTENSIONS } from './parsers/index.js';
import type { ExtractOptions } from './parsers/index.js';

export interface ExtractTextInput {
  path: string;
  options?: {
    maxPages?: number;
    sheetNames?: string[];
    chunkSize?: number;
    includeMetadata?: boolean;
    ocrEnabled?: boolean;
    ocrTimeoutMs?: number;
    maxRows?: number;
    maxFiles?: number;
  };
}

/**
 * Extracts readable text/structured content from any supported file type.
 *
 * Supported formats:
 *   Documents  → .pdf, .docx, .doc, .pptx
 *   Spreadsheets → .xlsx, .xls, .csv
 *   Images     → .png, .jpg, .jpeg, .gif, .webp, .bmp, .tiff, .svg
 *   Archives   → .zip
 *   Text       → any text-based file
 *
 * Options:
 *   maxPages    – limit pages extracted from PDFs
 *   maxRows     – limit rows extracted from Excel/CSV
 *   maxFiles    – limit files listed from ZIP
 *   chunkSize   – if set, splits the resulting text into chunks of N chars
 *   includeMetadata – include file stats (size, modified date)
 *   ocrEnabled  – run OCR on images (requires tesseract.js)
 *   ocrTimeoutMs – timeout for OCR in milliseconds
 */
export default async function extractTextTool(input: ExtractTextInput, config: Config) {
  if (!input || typeof input.path !== 'string') throw new Error('missing path');
  const resolved = path.resolve(input.path);

  // Permission check
  const permission = await checkPermission(config, resolved, 'read');
  if (!permission.allowed) {
    throw new Error(`Access denied: ${permission.reason}`);
  }

  const buf = await fs.readFile(resolved);
  const ext = path.extname(resolved).toLowerCase();
  const opts = input.options ?? {};

  // Merge config-level parseable settings with per-call overrides
  const parseableConfig = config.security.parseable;
  const extractOptions: ExtractOptions = {
    maxPages:    opts.maxPages    ?? parseableConfig?.maxPdfPages,
    maxRows:     opts.maxRows     ?? parseableConfig?.maxExcelRows,
    maxFiles:    opts.maxFiles    ?? parseableConfig?.maxZipFiles,
    ocrEnabled:  opts.ocrEnabled  ?? parseableConfig?.ocrEnabled  ?? false,
    ocrTimeoutMs: opts.ocrTimeoutMs ?? parseableConfig?.ocrTimeoutMs ?? 30000,
  };

  // Optional metadata
  let metadata: Record<string, unknown> | undefined;
  if (opts.includeMetadata) {
    const stats = await fs.stat(resolved);
    metadata = {
      name: path.basename(resolved),
      extension: ext,
      sizeBytes: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      modified: stats.mtime.toISOString(),
      created: stats.birthtime.toISOString(),
    };
  }

  // Try dedicated parser first
  if (hasParser(ext)) {
    try {
      const parsed = await parseFile(buf, resolved, parseableConfig ?? undefined, extractOptions);
      if (parsed !== null) {
        const result: Record<string, unknown> = { path: resolved, ...parsed };
        if (metadata) result.metadata = metadata;

        // Optional chunking: split text content for large files
        if (opts.chunkSize && 'text' in parsed && typeof parsed.text === 'string') {
          const chunks: string[] = [];
          for (let i = 0; i < parsed.text.length; i += opts.chunkSize) {
            chunks.push(parsed.text.slice(i, i + opts.chunkSize));
          }
          result.text = chunks[0]; // first chunk
          result.chunks = chunks.length;
          result.totalChars = parsed.text.length;
          if (chunks.length > 1) {
            result.note = `Text split into ${chunks.length} chunks of ~${opts.chunkSize} chars. ` +
              `Use chunkIndex option to retrieve subsequent chunks.`;
          }
        }

        return result;
      }
    } catch (err: any) {
      return {
        path: resolved,
        format: 'error',
        error: `Parser failed for ${ext}: ${err?.message ?? String(err)}`,
        metadata,
      };
    }
  }

  // Plain text fallback
  try {
    const text = buf.toString('utf8');
    const result: Record<string, unknown> = {
      path: resolved,
      format: 'text',
      content: opts.chunkSize ? text.slice(0, opts.chunkSize) : text,
      metadata,
    };
    if (opts.chunkSize && text.length > opts.chunkSize) {
      result.chunks = Math.ceil(text.length / opts.chunkSize);
      result.totalChars = text.length;
    }
    return result;
  } catch {
    // Binary without parser
    return {
      path: resolved,
      format: 'binary',
      content: buf.toString('base64'),
      encoding: 'base64',
      warning: `No parser available for "${ext}". Returned as base64.`,
      supportedFormats: Array.from(PARSEABLE_EXTENSIONS).sort(),
      metadata,
    };
  }
}
