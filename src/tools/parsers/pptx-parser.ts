

export interface SlideData {
  index: number;
  text: string;
  notes: string;
}

export interface PptxParseResult {
  format: 'pptx';
  slideCount: number;
  slides: SlideData[];
}

/**
 * Extracts text from a PPTX file by unzipping it and parsing the XML slide files.
 * PPTX is a ZIP archive containing XML files — no extra library needed beyond adm-zip.
 */
export async function parsePptx(buf: Buffer): Promise<PptxParseResult> {
  const AdmZip = (await import('adm-zip')).default;

  const zip = new AdmZip(buf);
  const entries = zip.getEntries();

  // Find slide XML files: ppt/slides/slide1.xml, slide2.xml, etc.
  const slideEntries = entries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)/i)?.[1] ?? '0', 10);
      const numB = parseInt(b.entryName.match(/slide(\d+)/i)?.[1] ?? '0', 10);
      return numA - numB;
    });

  // Find notes XML files: ppt/notesSlides/notesSlide1.xml
  const notesEntries = entries
    .filter((e) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/notesSlide(\d+)/i)?.[1] ?? '0', 10);
      const numB = parseInt(b.entryName.match(/notesSlide(\d+)/i)?.[1] ?? '0', 10);
      return numA - numB;
    });

  function extractText(xml: string): string {
    // Extract all <a:t> tag content (text runs in OOXML)
    const matches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) ?? [];
    return matches
      .map((m) => m.replace(/<[^>]+>/g, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const slides: SlideData[] = slideEntries.map((entry, i) => {
    const xml = entry.getData().toString('utf8');
    const notesEntry = notesEntries[i];
    const notesXml = notesEntry ? notesEntry.getData().toString('utf8') : '';

    return {
      index: i + 1,
      text: extractText(xml),
      notes: extractText(notesXml),
    };
  });

  return {
    format: 'pptx',
    slideCount: slides.length,
    slides,
  };
}
