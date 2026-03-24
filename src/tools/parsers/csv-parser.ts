export interface CsvParseResult {
  format: 'csv';
  headers: string[];
  rows: string[][];
  totalRows: number;
  truncated: boolean;
}

export async function parseCsv(buf: Buffer, maxRows = 5000): Promise<CsvParseResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Papa = require('papaparse') as {
    parse: <T>(input: string, config: Record<string, unknown>) => { data: T[]; errors: unknown[] };
  };

  const text = buf.toString('utf8');
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const allRows = result.data as string[][];
  if (allRows.length === 0) {
    return { format: 'csv', headers: [], rows: [], totalRows: 0, truncated: false };
  }

  const headers = allRows[0];
  const dataRows = allRows.slice(1);
  const totalRows = dataRows.length;
  const truncated = totalRows > maxRows;

  return {
    format: 'csv',
    headers,
    rows: dataRows.slice(0, maxRows),
    totalRows,
    truncated,
  };
}
