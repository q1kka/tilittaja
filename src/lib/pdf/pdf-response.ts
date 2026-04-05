import { NextResponse } from 'next/server';

export function pdfResponse(
  data: Buffer | Uint8Array,
  filename: string,
  options?: { inline?: boolean; noCache?: boolean },
): NextResponse {
  const disposition = (options?.inline ?? true) ? 'inline' : 'attachment';
  const headers: Record<string, string> = {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${disposition}; filename="${filename}"`,
  };
  if (options?.noCache) {
    headers['Cache-Control'] = 'no-store';
  }
  return new NextResponse(new Uint8Array(data), { headers });
}
