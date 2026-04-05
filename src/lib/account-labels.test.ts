import { describe, expect, it } from 'vitest';
import { getAccountTypeLabel } from '@/lib/account-labels';

describe('account-labels', () => {
  it('returns labels for known ACCOUNT_TYPES keys', () => {
    expect(getAccountTypeLabel(0)).toBe('Vastaavaa');
    expect(getAccountTypeLabel(1)).toBe('Vastattavaa');
    expect(getAccountTypeLabel(2)).toBe('Oma pääoma');
    expect(getAccountTypeLabel(3)).toBe('Tulot');
    expect(getAccountTypeLabel(4)).toBe('Menot');
    expect(getAccountTypeLabel(5)).toBe('Ed. tilikausien voitto');
    expect(getAccountTypeLabel(6)).toBe('Tilikauden voitto');
  });

  it('returns Muu for unknown type numbers', () => {
    expect(getAccountTypeLabel(99)).toBe('Muu');
    expect(getAccountTypeLabel(-1)).toBe('Muu');
  });
});
