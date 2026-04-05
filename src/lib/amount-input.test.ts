import { describe, expect, it } from 'vitest';
import {
  formatAmountInputValue,
  normalizeAmountSearchValue,
  parseAmountInputValue,
  toCents,
} from '@/lib/amount-input';

describe('amount-input', () => {
  describe('formatAmountInputValue', () => {
    it('formats integer with two decimals', () => {
      expect(formatAmountInputValue(42)).toBe('42,00');
    });

    it('formats decimal with comma', () => {
      expect(formatAmountInputValue(12.34)).toBe('12,34');
    });

    it('formats zero', () => {
      expect(formatAmountInputValue(0)).toBe('0,00');
    });

    it('formats large numbers', () => {
      expect(formatAmountInputValue(1_234_567.89)).toBe('1234567,89');
    });
  });

  describe('parseAmountInputValue', () => {
    it('parses comma decimals', () => {
      expect(parseAmountInputValue('12,34')).toBe(12.34);
    });

    it('parses whole numbers', () => {
      expect(parseAmountInputValue('100')).toBe(100);
    });

    it('trims whitespace', () => {
      expect(parseAmountInputValue('  5,00  ')).toBe(5);
    });

    it('returns null for non-numeric input', () => {
      expect(parseAmountInputValue('abc')).toBeNull();
    });

    it('returns null for negative values', () => {
      expect(parseAmountInputValue('-1')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseAmountInputValue('')).toBeNull();
    });

    it('returns null for more than two decimal places', () => {
      expect(parseAmountInputValue('1,234')).toBeNull();
    });

    it('returns null for lone comma', () => {
      expect(parseAmountInputValue(',')).toBeNull();
    });

    it('returns zero for valid zero input', () => {
      expect(parseAmountInputValue('0')).toBe(0);
    });
  });

  describe('toCents', () => {
    it('converts euros to cents', () => {
      expect(toCents(10.5)).toBe(1050);
    });

    it('returns zero for zero', () => {
      expect(toCents(0)).toBe(0);
    });

    it('rounds floating point amounts', () => {
      expect(toCents(19.99)).toBe(1999);
    });
  });

  describe('normalizeAmountSearchValue', () => {
    it('normalizes Finnish-style amount with euro and thousands separator', () => {
      expect(normalizeAmountSearchValue('1.000,50 €')).toBe('1000.50');
    });

    it('leaves plain integers unchanged', () => {
      expect(normalizeAmountSearchValue('100')).toBe('100');
    });

    it('strips non-breaking spaces', () => {
      expect(normalizeAmountSearchValue('12\u00a0345,67')).toBe('12345.67');
    });
  });
});
