import type { ParseableConfig } from '../../permissions/config-loader.js';

export interface PdfParseResult {
  format: 'pdf';
  pages: number;
  text: string;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
  };
  truncated: boolean;
}

/**
 * pdf-parse v2.x ships a class-based API.
 * The module exports { PDFParse, ... } — NOT a callable function.
 * Buffer is passed via the constructor option `data`.
 * Pages are limited with `{ first: N }` (v1 used `{ max: N }`).
 */
export async function parsePdf(buf: Buffer, options?: ParseableConfig): Promise<PdfParseResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: Record<string, unknown>) => any };
  const maxPages = options?.maxPdfPages ?? 50;

  // --- Extract text (limited to first maxPages pages) ---
  const textParser = new PDFParse({ data: buf, verbosity: 0 });
  const textResult = await textParser.getText({ first: maxPages }) as {
    total: number;
    text: string;
    pages: Array<{ text: string; num: number }>;
  };

  const totalPages: number = textResult.total;
  const truncated = totalPages > maxPages;

  // --- Extract metadata (use a fresh instance to avoid page-cleanup side effects) ---
  let rawInfo: Record<string, unknown> = {};
  try {
    const infoParser = new PDFParse({ data: buf, verbosity: 0 });
    const infoResult = await infoParser.getInfo() as { info?: Record<string, unknown> };
    rawInfo = infoResult?.info ?? {};
  } catch {
    // Metadata is best-effort; never block text extraction
  }

  const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

  return {
    format: 'pdf',
    pages: totalPages,
    text: textResult.text?.trim() ?? '',
    metadata: {
      title:        str(rawInfo?.Title),
      author:       str(rawInfo?.Author),
      subject:      str(rawInfo?.Subject),
      creator:      str(rawInfo?.Creator),
      producer:     str(rawInfo?.Producer),
      creationDate: str(rawInfo?.CreationDate),
    },
    truncated,
  };
}
