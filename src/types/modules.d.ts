// Type declarations for packages without @types/* on npm

declare module 'papaparse' {
  interface ParseConfig {
    header?: boolean;
    skipEmptyLines?: boolean | 'greedy';
    dynamicTyping?: boolean;
    delimiter?: string;
    newline?: string;
    quoteChar?: string;
    escapeChar?: string;
    encoding?: string;
    worker?: boolean;
    comments?: boolean | string;
    step?: (results: ParseResult<unknown>, parser: Parser) => void;
    complete?: (results: ParseResult<unknown>, file?: File) => void;
    error?: (error: ParseError, file?: File) => void;
    download?: boolean;
    preview?: number;
    fastMode?: boolean;
    withCredentials?: boolean;
    transform?: (value: string, field: string | number) => unknown;
  }
  interface ParseResult<T> {
    data: T[];
    errors: ParseError[];
    meta: ParseMeta;
  }
  interface ParseError {
    type: string;
    code: string;
    message: string;
    row: number;
  }
  interface ParseMeta {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    fields?: string[];
    truncated: boolean;
  }
  interface Parser {
    abort(): void;
  }
  function parse<T = unknown>(input: string | File | NodeJS.ReadableStream, config?: ParseConfig): ParseResult<T>;
  export { parse, ParseConfig, ParseResult, ParseError, ParseMeta };
  export default { parse };
}

declare module 'pdf-parse' {
  interface PDFInfo {
    Title?: string;
    Author?: string;
    Subject?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    [key: string]: unknown;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: unknown;
    version: string;
    text: string;
  }

  function pdfParse(dataBuffer: Buffer, options?: { max?: number; [key: string]: unknown }): Promise<PDFData>;
  export = pdfParse;
}

declare module 'adm-zip' {
  interface IZipEntry {
    entryName: string;
    name: string;
    isDirectory: boolean;
    comment: string;
    getData(): Buffer;
    getDataAsync(callback: (data: Buffer, err: string) => void): void;
    header: Buffer;
    attr: number;
    extra: Buffer;
  }

  class AdmZip {
    constructor(fileNameOrRawData?: string | Buffer);
    getEntries(): IZipEntry[];
    getEntry(name: string): IZipEntry | null;
    readAsText(fileName: string, encoding?: string): string;
    extractAllTo(targetPath: string, overwrite?: boolean, keepOriginalPermission?: boolean, pass?: string): void;
    extractEntryTo(entry: IZipEntry | string, targetPath: string, maintainEntryPath?: boolean, overwrite?: boolean): boolean;
    addFile(entryName: string, data: Buffer, comment?: string, attr?: number): IZipEntry;
    addLocalFile(localPath: string, zipPath?: string, zipName?: string, comment?: string): void;
    deleteFile(entry: IZipEntry | string): void;
    writeZip(targetFileName?: string, callback?: (error: Error | null) => void): void;
    toBuffer(): Buffer;
  }

  export = AdmZip;
}
