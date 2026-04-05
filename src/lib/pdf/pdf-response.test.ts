import { describe, expect, it } from 'vitest';
import { pdfResponse } from './pdf-response';

describe('pdfResponse', () => {
  const data = Buffer.from('fake-pdf-data');

  it('returns inline disposition by default', () => {
    const response = pdfResponse(data, 'report.pdf');
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toBe(
      'inline; filename="report.pdf"',
    );
  });

  it('returns attachment disposition when inline is false', () => {
    const response = pdfResponse(data, 'download.pdf', { inline: false });
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="download.pdf"',
    );
  });

  it('adds Cache-Control when noCache is true', () => {
    const response = pdfResponse(data, 'report.pdf', { noCache: true });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('does not add Cache-Control by default', () => {
    const response = pdfResponse(data, 'report.pdf');
    expect(response.headers.get('Cache-Control')).toBeNull();
  });

  it('accepts Uint8Array as data', () => {
    const uint8 = new Uint8Array([1, 2, 3]);
    const response = pdfResponse(uint8, 'test.pdf');
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
  });
});
