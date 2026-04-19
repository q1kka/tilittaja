import { describe, expect, it } from 'vitest';
import {
  normalizeImportedBankStatement,
  sanitizeImportedBankStatementPdfName,
} from './bank-statement-import';

describe('sanitizeImportedBankStatementPdfName', () => {
  it('normalizes imported PDF names to safe ASCII slugs', () => {
    expect(
      sanitizeImportedBankStatementPdfName('Tiliöte 03/2026 (Päätili).pdf'),
    ).toBe('tiliote-03-2026-paatili');
  });

  it('falls back to a generic name when the source name is empty', () => {
    expect(sanitizeImportedBankStatementPdfName('.pdf')).toBe('tiliote');
  });
});

describe('normalizeImportedBankStatement', () => {
  it('fills defaults for optional values and sequential transaction numbers', () => {
    const result = normalizeImportedBankStatement({
      iban: ' FI11 1234 5600 0007 85 ',
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      openingBalance: null,
      closingBalance: 1400.55,
      entries: [
        {
          entryDate: '2026-03-02',
          valueDate: null,
          archiveId: null,
          counterparty: ' Example Oy ',
          counterpartyIban: null,
          reference: ' ',
          message: null,
          paymentType: null,
          transactionNumber: null,
          amount: -25.4,
        },
      ],
    });

    expect(result.iban).toBe('FI11 1234 5600 0007 85');
    expect(result.openingBalance).toBe(0);
    expect(result.closingBalance).toBe(1400.55);
    expect(result.entries).toEqual([
      {
        entryDate: Date.parse('2026-03-02T00:00:00.000Z'),
        valueDate: null,
        archiveId: '',
        counterparty: 'Example Oy',
        counterpartyIban: null,
        reference: null,
        message: null,
        paymentType: '',
        transactionNumber: 1,
        amount: -25.4,
      },
    ]);
  });
});
