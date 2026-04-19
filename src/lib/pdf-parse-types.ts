export interface PdfParseResult {
  text?: string;
}

export interface PdfParseInstance {
  getText(): Promise<PdfParseResult>;
  destroy(): Promise<void>;
}

export type PdfParseConstructor = new (options: {
  data: Buffer | Uint8Array;
}) => PdfParseInstance;
