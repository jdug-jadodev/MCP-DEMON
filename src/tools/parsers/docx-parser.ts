export interface DocxParseResult {
  format: 'docx';
  text: string;
  html: string;
  messages: string[];
}

export async function parseDocx(buf: Buffer): Promise<DocxParseResult> {
  const mammoth = await import('mammoth');

  const [textResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ buffer: buf }),
    mammoth.convertToHtml({ buffer: buf }),
  ]);

  return {
    format: 'docx',
    text: textResult.value?.trim() ?? '',
    html: htmlResult.value?.trim() ?? '',
    messages: [
      ...textResult.messages.map((m) => `[${m.type}] ${m.message}`),
    ],
  };
}
