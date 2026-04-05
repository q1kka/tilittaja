import type { Account, Entry } from '@/lib/types';

export function account(overrides: Partial<Account>): Account {
  return {
    id: 0,
    number: '0000',
    name: 'Testitili',
    type: 0,
    vat_code: 0,
    vat_percentage: 0,
    vat_account1_id: null,
    vat_account2_id: null,
    flags: 0,
    ...overrides,
  };
}

export function entry(overrides: Partial<Entry>): Entry {
  return {
    id: 0,
    document_id: 1,
    account_id: 0,
    debit: true,
    amount: 0,
    description: '',
    row_number: 1,
    flags: 0,
    ...overrides,
  };
}
