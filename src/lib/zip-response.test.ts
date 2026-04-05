import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { zipResponse } from './zip-response';

describe('zipResponse', () => {
  it('returns a response with zip content-type and disposition', async () => {
    const zip = new JSZip();
    zip.file('test.txt', 'hello');

    const response = await zipResponse(zip, 'archive.zip');
    expect(response.headers.get('Content-Type')).toBe('application/zip');
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="archive.zip"',
    );
    expect(response.headers.get('Cache-Control')).toBeNull();
  });

  it('adds Cache-Control when noCache is true', async () => {
    const zip = new JSZip();
    zip.file('test.txt', 'data');

    const response = await zipResponse(zip, 'export.zip', { noCache: true });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns a valid body', async () => {
    const zip = new JSZip();
    zip.file('test.txt', 'content');

    const response = await zipResponse(zip, 'test.zip');
    const body = await response.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(0);
  });
});
