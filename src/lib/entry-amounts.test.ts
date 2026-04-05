import { describe, expect, it } from 'vitest';
import { getCreditAmount, getDebitAmount } from '@/lib/entry-amounts';

describe('entry-amounts', () => {
  it('debit true puts amount on debit', () => {
    expect(getDebitAmount(100, true)).toBe(100);
    expect(getCreditAmount(100, true)).toBe(0);
  });

  it('debit false puts amount on credit', () => {
    expect(getDebitAmount(100, false)).toBe(0);
    expect(getCreditAmount(100, false)).toBe(100);
  });

  it('handles zero amount for both sides', () => {
    expect(getDebitAmount(0, true)).toBe(0);
    expect(getCreditAmount(0, true)).toBe(0);
    expect(getDebitAmount(0, false)).toBe(0);
    expect(getCreditAmount(0, false)).toBe(0);
  });
});
