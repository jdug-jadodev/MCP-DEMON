import { promises as fs } from 'fs';
import * as path from 'path';
import type { Config } from '../permissions/config-loader.js';
import { checkPermission } from '../permissions/evaluator.js';
import { parseFile, hasParser } from './parsers/index.js';

function isProbablyBinary(buf: Buffer) {
  // Heuristic: if NUL byte present or a high ratio of non-printable chars
  if (buf.includes(0)) return true;
  const textChars = buf.slice(0, 8000).toString('utf8');
  let nonPrintable = 0;
  for (let i = 0; i < textChars.length; i++) {
    const code = textChars.charCodeAt(i);
    if (code === 65533) nonPrintable++; // replacement char
    else if (code < 32 && code !== 9 && code !== 10 && code !== 13) nonPrintable++;
  }
  return (nonPrintable / Math.max(1, textChars.length)) > 0.3;
}

export default async function readFileTool(input: { path: string }, config: Config) {
  if (!input || typeof input.path !== 'string') throw new Error('missing path');
  const resolved = path.resolve(input.path);

  // Check permissions before reading
  const permission = await checkPermission(config, resolved, 'read');
  if (!permission.allowed) {
    throw new Error(`Access denied: ${permission.reason}`);
  }

  const buf = await fs.readFile(resolved);
  const ext = path.extname(resolved).toLowerCase();

  // --- FASE 3: Route to a dedicated parser if available ---
  if (hasParser(ext)) {
    try {
      const parsed = await parseFile(buf, resolved, config.security.parseable ?? undefined);
      if (parsed !== null) {
        return { path: resolved, ...parsed };
      }
    } catch (err: any) {
      // Parser failed — fall through to text/base64 fallback
      return {
        path: resolved,
        format: 'error',
        error: `Parser failed for ${ext}: ${err?.message ?? String(err)}`,
        content: buf.toString('base64'),
        encoding: 'base64',
      };
    }
  }

  // --- Legacy behaviour: explicit binary list from config → base64 ---
  // binaryExtensions now means "opaque binary, no parser available"
  const forceBinary = Array.isArray(config.security.binaryExtensions)
    ? config.security.binaryExtensions.map((e: string) => e.toLowerCase()).includes(ext)
    : false;

  if (forceBinary || isProbablyBinary(buf)) {
    return {
      path: resolved,
      format: 'binary',
      content: buf.toString('base64'),
      encoding: 'base64',
      isBinary: true,
      warning: 'No parser available for this file type. Content returned as base64.',
    };
  }

  // --- Plain text ---
  return { path: resolved, format: 'text', content: buf.toString('utf8') };
}
