import { describe, expect, it } from 'vitest';
import { buildDocumentListHref } from '@/lib/document-links';

describe('document-links', () => {
  it('includes period when periodId is set', () => {
    expect(buildDocumentListHref(42, 7)).toBe(
      '/documents?document=42&period=7',
    );
  });

  it('omits period when periodId is undefined', () => {
    expect(buildDocumentListHref(42)).toBe('/documents?document=42');
  });

  it('omits period when periodId is null', () => {
    expect(buildDocumentListHref(42, null)).toBe('/documents?document=42');
  });
});
