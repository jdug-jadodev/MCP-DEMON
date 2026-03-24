import { describe, it, expect } from 'vitest';
import { parseFile, hasParser, PARSEABLE_EXTENSIONS } from '../src/tools/parsers/index';
import { readFileSync } from 'fs';
import * as path from 'path';

describe('parsers/index - enrutador', () => {
  it('should detect parseable extensions correctly', () => {
    expect(hasParser('.pdf')).toBe(true);
    expect(hasParser('.docx')).toBe(true);
    expect(hasParser('.xlsx')).toBe(true);
    expect(hasParser('.csv')).toBe(true);
    expect(hasParser('.pptx')).toBe(true);
    expect(hasParser('.png')).toBe(true);
    expect(hasParser('.zip')).toBe(true);
  });

  it('should return null for unknown extensions', async () => {
    const buf = Buffer.from('hello world');
    const result = await parseFile(buf, 'file.xyz');
    expect(result).toBeNull();
  });

  it('should return null for extensions without parser', async () => {
    const buf = Buffer.from('test');
    const result = await parseFile(buf, 'file.exe');
    expect(result).toBeNull();
  });

  it('PARSEABLE_EXTENSIONS should contain all expected formats', () => {
    const expected = ['.pdf', '.docx', '.xlsx', '.csv', '.png', '.jpg', '.zip', '.pptx'];
    for (const ext of expected) {
      expect(PARSEABLE_EXTENSIONS.has(ext)).toBe(true);
    }
  });

  it('should parse CSV via router', async () => {
    const fixturePath = path.resolve(__dirname, 'fixtures/sample.csv');
    const buf = readFileSync(fixturePath);
    const result = await parseFile(buf, fixturePath);
    expect(result).not.toBeNull();
    expect(result!.format).toBe('csv');
  });
});
