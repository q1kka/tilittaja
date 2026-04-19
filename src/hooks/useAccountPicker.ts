import { useMemo, useState, useCallback } from 'react';
import type { AccountOption } from '@/lib/types';

interface UseAccountPickerOptions {
  accounts: AccountOption[];
  onConfirm: (entryId: number, accountId: number) => void;
}

export function useAccountPicker({
  accounts,
  onConfirm,
}: UseAccountPickerOptions) {
  const [entryId, setEntryId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );

  const isOpen = entryId != null;

  const sortedAccounts = useMemo(
    () => [...accounts].sort((a, b) => a.number.localeCompare(b.number, 'fi')),
    [accounts],
  );

  const selectedAccount = useMemo(
    () =>
      selectedAccountId != null
        ? (sortedAccounts.find((a) => a.id === selectedAccountId) ?? null)
        : null,
    [selectedAccountId, sortedAccounts],
  );

  const open = useCallback(
    (targetEntryId: number, currentAccountId: number | null) => {
      setEntryId(targetEntryId);
      setSelectedAccountId(currentAccountId);
    },
    [],
  );

  const close = useCallback(() => {
    setEntryId(null);
    setSelectedAccountId(null);
  }, []);

  const confirm = useCallback(() => {
    if (entryId == null || selectedAccountId == null) return;
    onConfirm(entryId, selectedAccountId);
    close();
  }, [entryId, selectedAccountId, onConfirm, close]);

  return {
    isOpen,
    entryId,
    selectedAccountId,
    selectedAccount,
    sortedAccounts,
    open,
    close,
    setSelectedAccountId,
    confirm,
  } as const;
}
