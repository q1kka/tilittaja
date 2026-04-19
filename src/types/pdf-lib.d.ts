declare module 'pdf-lib' {
  export class PDFPage {}

  export class PDFDocument {
    static create(): Promise<PDFDocument>;
    static load(data: ArrayBuffer | Uint8Array): Promise<PDFDocument>;
    getPageIndices(): number[];
    copyPages(source: PDFDocument, indices: number[]): Promise<PDFPage[]>;
    addPage(page: PDFPage): void;
    getPageCount(): number;
    save(): Promise<Uint8Array>;
  }
}
