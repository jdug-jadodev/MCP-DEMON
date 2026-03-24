import * as path from 'path';

export interface ImageParseResult {
  format: 'image';
  mimeType: string;
  width: number;
  height: number;
  channels: number;
  sizeKB: number;
  base64: string;
  // ocrText is populated only when OCR is enabled in config
  ocrText?: string;
}

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.svg': 'image/svg+xml',
};

export async function parseImage(
  buf: Buffer,
  ext: string,
  options?: { ocrEnabled?: boolean; ocrTimeoutMs?: number }
): Promise<ImageParseResult> {
  const mimeType = MIME_MAP[ext.toLowerCase()] ?? 'application/octet-stream';

  // SVG is text-based — handle separately
  if (ext.toLowerCase() === '.svg') {
    return {
      format: 'image',
      mimeType,
      width: 0,
      height: 0,
      channels: 0,
      sizeKB: Math.round(buf.length / 1024),
      base64: buf.toString('base64'),
    };
  }

  const sharp = (await import('sharp')).default;
  const metadata = await sharp(buf).metadata();

  const result: ImageParseResult = {
    format: 'image',
    mimeType,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    channels: metadata.channels ?? 0,
    sizeKB: Math.round(buf.length / 1024),
    base64: buf.toString('base64'),
  };

  // Optional OCR via tesseract.js (only if installed and enabled)
  if (options?.ocrEnabled) {
    try {
      const timeoutMs = options.ocrTimeoutMs ?? 30000;
      const { createWorker } = await import('tesseract.js' as any);
      const worker = await Promise.race([
        createWorker('eng'),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('OCR timeout')), timeoutMs)
        ),
      ]) as any;
      const { data } = await worker.recognize(buf);
      await worker.terminate();
      result.ocrText = data.text?.trim();
    } catch {
      result.ocrText = '[OCR not available or timed out]';
    }
  }

  return result;
}
