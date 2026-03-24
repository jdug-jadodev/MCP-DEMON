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

export async function parsePdf(buf: Buffer, options?: ParseableConfig): Promise<PdfParseResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse: (buf: Buffer, opts?: { max?: number }) => Promise<{ numpages: number; text: string; info: Record<string, unknown> }> = require('pdf-parse');
  const maxPages = options?.maxPdfPages ?? 50;

  const data = await pdfParse(buf, {
    max: maxPages,
  });

  const truncated = data.numpages > maxPages;

  const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

  return {
    format: 'pdf',
    pages: data.numpages,
    text: data.text?.trim() ?? '',
    metadata: {
      title:        str(data.info?.Title),
      author:       str(data.info?.Author),
      subject:      str(data.info?.Subject),
      creator:      str(data.info?.Creator),
      producer:     str(data.info?.Producer),
      creationDate: str(data.info?.CreationDate),
    },
    truncated,
  };
}
