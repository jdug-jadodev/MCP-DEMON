import { promises as fs } from 'fs';
import * as path from 'path';
import type { Config } from '../permissions/config-loader.js';
import { checkPermission } from '../permissions/evaluator.js';

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

  // Decide whether to return text or base64 for binary
  const ext = path.extname(resolved).toLowerCase();
  const alwaysBase64 = Array.isArray(config.security.binaryExtensions)
    ? config.security.binaryExtensions.map((e: string) => e.toLowerCase()).includes(ext)
    : false;

  if (alwaysBase64 || isProbablyBinary(buf)) {
    return { path: resolved, content: buf.toString('base64'), encoding: 'base64', isBinary: true };
  }

  return { path: resolved, content: buf.toString('utf8') };
}
