import { describe, expect, it } from 'vitest';
import { getDateInputValue, parseDateInputValue } from '@/lib/date-input';

describe('date-input', () => {
  describe('getDateInputValue', () => {
    it('formats mid-January in Helsinki', () => {
      expect(getDateInputValue(Date.UTC(2024, 0, 15, 12))).toBe('2024-01-15');
    });

    it('formats year end in Helsinki', () => {
      expect(getDateInputValue(Date.UTC(2024, 11, 31, 12))).toBe('2024-12-31');
    });
  });

  describe('parseDateInputValue', () => {
    it('parses ISO date to UTC noon', () => {
      expect(parseDateInputValue('2024-01-15')).toBe(Date.UTC(2024, 0, 15, 12));
    });

    it('returns null for invalid month', () => {
      expect(parseDateInputValue('2024-13-01')).toBeNull();
    });

    it('returns null for invalid day', () => {
      expect(parseDateInputValue('2024-01-32')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseDateInputValue('')).toBeNull();
    });

    it('returns null for garbage', () => {
      expect(parseDateInputValue('not-a-date')).toBeNull();
    });

    it('round-trips with getDateInputValue', () => {
      const ts = parseDateInputValue('2024-06-01');
      expect(ts).not.toBeNull();
      expect(getDateInputValue(ts!)).toBe('2024-06-01');
    });
  });
});
