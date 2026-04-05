import { describe, expect, it } from 'vitest';
import { buildPdfPreviewSrc } from './pdf-preview';

describe('buildPdfPreviewSrc', () => {
  it('appends viewer params to URL', () => {
    expect(buildPdfPreviewSrc('/api/reports/pdf')).toBe(
      '/api/reports/pdf#view=Fit&toolbar=0&navpanes=0&scrollbar=0&pagemode=none',
    );
  });

  it('works with full URLs', () => {
    const result = buildPdfPreviewSrc('https://example.com/doc.pdf');
    expect(result).toContain('https://example.com/doc.pdf#view=Fit');
  });
});
