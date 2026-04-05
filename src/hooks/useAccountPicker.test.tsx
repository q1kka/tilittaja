// @vitest-environment jsdom

import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAccountPicker } from './useAccountPicker';
import type { AccountOption } from '@/lib/types';

const accounts: AccountOption[] = [
  { id: 1, number: '3000', name: 'Myynti', type: 3, vat_percentage: 25.5 },
  { id: 2, number: '1910', name: 'Pankki', type: 0, vat_percentage: 0 },
  { id: 3, number: '6990', name: 'Kulut', type: 4, vat_percentage: 0 },
];

describe('useAccountPicker', () => {
  it('starts closed with no selection', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useAccountPicker({ accounts, onConfirm }),
    );

    expect(result.current.isOpen).toBe(false);
    expect(result.current.entryId).toBeNull();
    expect(result.current.selectedAccountId).toBeNull();
    expect(result.current.selectedAccount).toBeNull();
  });

  it('opens with target entry and pre-selected account', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useAccountPicker({ accounts, onConfirm }),
    );

    act(() => {
      result.current.open(5, 10);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.entryId).toBe(5);
    expect(result.current.selectedAccountId).toBe(10);
  });

  it('sorts accounts by number', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useAccountPicker({ accounts, onConfirm }),
    );

    const numbers = result.current.sortedAccounts.map((a) => a.number);
    expect(numbers).toEqual(['1910', '3000', '6990']);
  });

  it('resolves selectedAccount from sortedAccounts', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useAccountPicker({ accounts, onConfirm }),
    );

    act(() => {
      result.current.open(1, 2);
    });

    expect(result.current.selectedAccount).toEqual(accounts[1]);
  });

  it('confirm calls onConfirm and closes', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useAccountPicker({ accounts, onConfirm }),
    );

    act(() => {
      result.current.open(5, 2);
    });

    act(() => {
      result.current.confirm();
    });

    expect(onConfirm).toHaveBeenCalledWith(5, 2);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.entryId).toBeNull();
    expect(result.current.selectedAccountId).toBeNull();
  });

  it('confirm does nothing when no entry selected', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useAccountPicker({ accounts, onConfirm }),
    );

    act(() => {
      result.current.confirm();
    });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('close resets all state', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useAccountPicker({ accounts, onConfirm }),
    );

    act(() => {
      result.current.open(7, 3);
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.entryId).toBeNull();
    expect(result.current.selectedAccountId).toBeNull();
    expect(result.current.selectedAccount).toBeNull();
  });
});
