import JSZip from 'jszip';
import { NextResponse } from 'next/server';

export async function zipResponse(
  zip: JSZip,
  filename: string,
  options?: { noCache?: boolean },
): Promise<NextResponse> {
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const headers: Record<string, string> = {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${filename}"`,
  };
  if (options?.noCache) {
    headers['Cache-Control'] = 'no-store';
  }
  return new NextResponse(new Uint8Array(zipBuffer), { headers });
}
