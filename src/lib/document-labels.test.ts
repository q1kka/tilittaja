import { describe, expect, it } from 'vitest';

import {
  buildDocumentCode,
  resolveDocumentLabel,
  resolveDocumentLabels,
} from '@/lib/document-labels';

describe('buildDocumentCode', () => {
  it('returns "MU-5" for category MU and number 5', () => {
    expect(buildDocumentCode('MU', 5)).toBe('MU-5');
  });

  it('returns bare number when category is empty', () => {
    expect(buildDocumentCode('', 12)).toBe('12');
  });

  it('trims whitespace from category', () => {
    expect(buildDocumentCode('  OP  ', 1)).toBe('OP-1');
  });

  it('uppercases lowercase category', () => {
    expect(buildDocumentCode('mu', 7)).toBe('MU-7');
  });
});

describe('resolveDocumentLabel', () => {
  it('uses storedCategory and storedName when provided', () => {
    expect(
      resolveDocumentLabel({
        number: 10,
        storedCategory: 'OP',
        storedName: 'Lasku',
      }),
    ).toEqual({
      category: 'OP',
      name: 'Lasku',
      code: 'OP-10',
      description: 'Lasku',
    });
  });

  it('parses legacy description "MU-003: Vuokra" when number matches', () => {
    expect(
      resolveDocumentLabel({
        number: 3,
        fallbackDescription: 'MU-003: Vuokra',
      }),
    ).toEqual({
      category: 'MU',
      name: 'Vuokra',
      code: 'MU-3',
      description: 'Vuokra',
    });
  });

  it('uses displayNumber for code when provided', () => {
    expect(
      resolveDocumentLabel({
        number: 3,
        displayNumber: 99,
        storedCategory: 'MU',
        storedName: 'X',
      }),
    ).toEqual({
      category: 'MU',
      name: 'X',
      code: 'MU-99',
      description: 'X',
    });
  });

  it('defaults category to "MU" when no stored or legacy category', () => {
    expect(
      resolveDocumentLabel({
        number: 5,
        fallbackDescription: 'Plain text without code',
      }),
    ).toMatchObject({
      category: 'MU',
      name: 'Plain text without code',
      code: 'MU-5',
    });
  });

  it('uses code as description when name resolves empty', () => {
    expect(
      resolveDocumentLabel({
        number: 2,
        storedCategory: 'OP',
      }),
    ).toEqual({
      category: 'OP',
      name: '',
      code: 'OP-2',
      description: 'OP-2',
    });
  });

  it('treats null and empty fallbackDescription as absent', () => {
    expect(
      resolveDocumentLabel({
        number: 1,
        storedCategory: null,
        storedName: null,
        fallbackDescription: null,
      }),
    ).toEqual({
      category: 'MU',
      name: '',
      code: 'MU-1',
      description: 'MU-1',
    });

    expect(
      resolveDocumentLabel({
        number: 1,
        fallbackDescription: '',
      }),
    ).toEqual({
      category: 'MU',
      name: '',
      code: 'MU-1',
      description: 'MU-1',
    });
  });
});

describe('resolveDocumentLabels', () => {
  it('assigns sequential display numbers per category', () => {
    const map = resolveDocumentLabels([
      { id: 1, number: 1, storedCategory: 'MU', storedName: 'A' },
      { id: 2, number: 2, storedCategory: 'MU', storedName: 'B' },
      { id: 3, number: 3, storedCategory: 'MU', storedName: 'C' },
    ]);
    expect(map.get(1)?.code).toBe('MU-1');
    expect(map.get(2)?.code).toBe('MU-2');
    expect(map.get(3)?.code).toBe('MU-3');
  });

  it('numbers MU and OP independently', () => {
    const map = resolveDocumentLabels([
      { id: 10, number: 100, storedCategory: 'MU' },
      { id: 20, number: 200, storedCategory: 'OP' },
      { id: 30, number: 300, storedCategory: 'MU' },
      { id: 40, number: 400, storedCategory: 'OP' },
    ]);
    expect(map.get(10)?.code).toBe('MU-1');
    expect(map.get(30)?.code).toBe('MU-2');
    expect(map.get(20)?.code).toBe('OP-1');
    expect(map.get(40)?.code).toBe('OP-2');
  });

  it('sorts by document number then id before assigning sequence', () => {
    const map = resolveDocumentLabels([
      { id: 5, number: 2, storedCategory: 'MU', storedName: 'second' },
      { id: 1, number: 1, storedCategory: 'MU', storedName: 'first' },
      { id: 9, number: 2, storedCategory: 'MU', storedName: 'also-two' },
    ]);
    expect(map.get(1)?.code).toBe('MU-1');
    expect(map.get(5)?.code).toBe('MU-2');
    expect(map.get(9)?.code).toBe('MU-3');
  });
});

describe('legacy document label pattern (via resolveDocumentLabel)', () => {
  it('accepts "MU004 Sähkölasku" without dash between letters and digits', () => {
    expect(
      resolveDocumentLabel({
        number: 4,
        fallbackDescription: 'MU004 Sähkölasku',
      }),
    ).toMatchObject({
      category: 'MU',
      name: 'Sähkölasku',
      code: 'MU-4',
    });
  });

  it('accepts leading whitespace, lowercase category, and padded number', () => {
    expect(
      resolveDocumentLabel({
        number: 7,
        fallbackDescription: '  mu-007: Test  ',
      }),
    ).toMatchObject({
      category: 'MU',
      name: 'Test',
      code: 'MU-7',
    });
  });

  it('does not parse legacy when embedded number does not match document number', () => {
    const resolved = resolveDocumentLabel({
      number: 3,
      fallbackDescription: 'MU-002: Foo',
    });
    expect(resolved.category).toBe('MU');
    expect(resolved.name).toBe('MU-002: Foo');
    expect(resolved.code).toBe('MU-3');
  });
});
