import { describe, expect, it } from 'vitest';
import { resolvePeriodId } from './page-params';

describe('resolvePeriodId', () => {
  const periods = [{ id: 1 }, { id: 2 }, { id: 3 }];

  it('returns the requested period when it exists', () => {
    expect(resolvePeriodId({ period: '2' }, periods, 1)).toBe(2);
  });

  it('falls back to the active period when query param is missing', () => {
    expect(resolvePeriodId({}, periods, 3)).toBe(3);
  });

  it('ignores invalid query params and falls back to the active period', () => {
    expect(resolvePeriodId({ period: '999' }, periods, 2)).toBe(2);
    expect(resolvePeriodId({ period: 'abc' }, periods, 2)).toBe(2);
  });
});
