import { describe, expect, it } from 'vitest';
import { slugifyDataSourceName } from './datasource-slug';

describe('slugifyDataSourceName', () => {
  it('normalizes Finnish characters and trims separators', () => {
    expect(slugifyDataSourceName(' Ääkköset & Testi Oy ')).toBe(
      'aakkoset-testi-oy',
    );
  });

  it('falls back to a default slug for empty input', () => {
    expect(slugifyDataSourceName('---')).toBe('kirjanpito');
  });
});
