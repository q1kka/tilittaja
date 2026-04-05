// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  useColumnResize,
  DOCUMENT_EXPAND_COLUMN_WIDTH,
} from './useColumnResize';

const STORAGE_KEY = 'documents-table-column-widths';

const DEFAULT_WIDTHS = {
  number: 72,
  date: 100,
  description: 280,
  receipt: 104,
  statement: 180,
  amount: 130,
};

const MIN_WIDTHS = {
  number: 60,
  date: 88,
  description: 180,
  receipt: 88,
  statement: 140,
  amount: 104,
};

beforeEach(() => {
  window.localStorage.removeItem(STORAGE_KEY);
});

describe('useColumnResize', () => {
  it('returns default column widths on initial render', () => {
    const { result } = renderHook(() => useColumnResize());

    expect(result.current.columnWidths).toEqual(DEFAULT_WIDTHS);
  });

  it('restores widths from localStorage', () => {
    const stored = {
      number: 90,
      date: 120,
      description: 300,
      receipt: 110,
      statement: 200,
      amount: 150,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const { result } = renderHook(() => useColumnResize());

    expect(result.current.columnWidths).toEqual(stored);
  });

  it('clamps restored widths to minimums', () => {
    const tooSmall = {
      number: 10,
      date: 10,
      description: 10,
      receipt: 10,
      statement: 10,
      amount: 10,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tooSmall));

    const { result } = renderHook(() => useColumnResize());

    expect(result.current.columnWidths).toEqual(MIN_WIDTHS);
  });

  it('computes documentsTableMinWidth from current widths', () => {
    const { result } = renderHook(() => useColumnResize());

    const expectedMin =
      DOCUMENT_EXPAND_COLUMN_WIDTH +
      Object.values(DEFAULT_WIDTHS).reduce((sum, w) => sum + w, 0);

    expect(result.current.documentsTableMinWidth).toBe(expectedMin);
  });

  it('persists widths to localStorage after ready', () => {
    const { result } = renderHook(() => useColumnResize());

    expect(result.current.columnWidthsReady).toBe(true);

    const persisted = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '{}',
    );
    expect(persisted).toEqual(DEFAULT_WIDTHS);
  });
});
