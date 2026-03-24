import type { ParseableConfig } from '../../permissions/config-loader.js';

export interface SheetData {
  name: string;
  rows: (string | number | boolean | null)[][];
  totalRows: number;
  truncated: boolean;
}

export interface ExcelParseResult {
  format: 'xlsx' | 'xls';
  sheetCount: number;
  sheets: SheetData[];
}

export async function parseExcel(buf: Buffer, ext: string, options?: ParseableConfig): Promise<ExcelParseResult> {
  const XLSX = await import('xlsx');
  const maxRows = options?.maxExcelRows ?? 5000;

  const workbook = XLSX.read(buf, { type: 'buffer', cellDates: true });

  const sheets: SheetData[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const allRows: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      raw: false,
    }) as (string | number | boolean | null)[][];

    const totalRows = allRows.length;
    const rows = allRows.slice(0, maxRows);

    return {
      name,
      rows,
      totalRows,
      truncated: totalRows > maxRows,
    };
  });

  return {
    format: ext === '.xls' ? 'xls' : 'xlsx',
    sheetCount: workbook.SheetNames.length,
    sheets,
  };
}
