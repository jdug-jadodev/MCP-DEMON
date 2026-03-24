import { describe, it, expect } from 'vitest';
import { parseCsv } from '../src/tools/parsers/csv-parser';
import { readFileSync } from 'fs';
import * as path from 'path';

const fixturePath = path.resolve(__dirname, 'fixtures/sample.csv');

describe('csv-parser', () => {
  it('should parse headers correctly', async () => {
    const buf = readFileSync(fixturePath);
    const result = await parseCsv(buf);
    expect(result.format).toBe('csv');
    expect(result.headers).toEqual(['nombre', 'edad', 'ciudad']);
  });

  it('should return rows', async () => {
    const buf = readFileSync(fixturePath);
    const result = await parseCsv(buf);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows[0][0]).toBe('Ana');
  });

  it('should truncate rows when maxRows exceeded', async () => {
    const buf = readFileSync(fixturePath);
    const result = await parseCsv(buf, 1);
    expect(result.rows.length).toBe(1);
    expect(result.truncated).toBe(true);
  });

  it('should report totalRows', async () => {
    const buf = readFileSync(fixturePath);
    const result = await parseCsv(buf);
    expect(result.totalRows).toBe(3);
  });
});
