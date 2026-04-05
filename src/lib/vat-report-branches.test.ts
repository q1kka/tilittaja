import { describe, expect, it } from 'vitest';
import {
  buildVatSettlementPreview,
  calculateVatReport,
} from '@/lib/vat-report';
import { account, entry } from '@/lib/test-helpers';

describe('calculateVatReport - branch coverage', () => {
  it('returns empty report with zero totals when no entries', () => {
    const report = calculateVatReport([], []);

    expect(report.lines).toHaveLength(12);
    expect(report.lines.every((line) => line.amount === 0)).toBe(true);
    expect(report.totals.salesBase).toBe(0);
    expect(report.totals.purchaseBase).toBe(0);
    expect(report.totals.outputVat).toBe(0);
    expect(report.totals.deductibleVat).toBe(0);
    expect(report.totals.payableVat).toBe(0);
    expect(report.totals.receivableVat).toBe(0);
  });

  it('handles accounts with no matching vat_code', () => {
    const accounts = [
      account({ id: 1, number: '1000', name: 'Kassa', type: 0, vat_code: 0 }),
    ];
    const entries = [entry({ account_id: 1, debit: true, amount: 500 })];

    const report = calculateVatReport(entries, accounts);
    expect(report.totals.salesBase).toBe(0);
    expect(report.totals.purchaseBase).toBe(0);
  });

  it('computes receivableVat when deductible exceeds output', () => {
    const accounts = [
      account({
        id: 2,
        number: '4000',
        name: 'Ostot',
        type: 4,
        vat_code: 5,
        vat_percentage: 24,
        vat_account1_id: 102,
      }),
      account({ id: 102, number: '29392', name: 'Alv ostoista', type: 1 }),
    ];
    const entries = [
      entry({ account_id: 2, debit: true, amount: 1000 }),
      entry({ account_id: 102, debit: true, amount: 240 }),
    ];

    const report = calculateVatReport(entries, accounts);

    expect(report.totals.outputVat).toBe(0);
    expect(report.totals.deductibleVat).toBe(240);
    expect(report.totals.payableVat).toBe(0);
    expect(report.totals.receivableVat).toBe(240);
  });

  it('filters out near-zero amounts (below 0.005 threshold)', () => {
    const accounts = [
      account({
        id: 1,
        number: '3000',
        name: 'Myynti',
        type: 3,
        vat_code: 4,
        vat_percentage: 24,
        vat_account1_id: 101,
      }),
      account({ id: 101, number: '29391', name: 'Alv myynnistä', type: 1 }),
    ];
    const entries = [
      entry({ account_id: 1, debit: false, amount: 0.003 }),
      entry({ account_id: 101, debit: false, amount: 0.001 }),
    ];

    const report = calculateVatReport(entries, accounts);

    expect(
      report.lines.find((l) => l.id === 'domestic-sales-base')!.details,
    ).toHaveLength(0);
    expect(
      report.lines.find((l) => l.id === 'domestic-sales-base')!.amount,
    ).toBe(0);
  });

  it('sorts detail rows by account number', () => {
    const accounts = [
      account({
        id: 1,
        number: '3200',
        name: 'Myynti B',
        type: 3,
        vat_code: 4,
        vat_percentage: 24,
        vat_account1_id: 101,
      }),
      account({
        id: 2,
        number: '3100',
        name: 'Myynti A',
        type: 3,
        vat_code: 4,
        vat_percentage: 24,
        vat_account1_id: 101,
      }),
      account({ id: 101, number: '29391', name: 'Alv myynnistä', type: 1 }),
    ];
    const entries = [
      entry({ account_id: 1, debit: false, amount: 200 }),
      entry({ account_id: 2, debit: false, amount: 100 }),
      entry({ account_id: 101, debit: false, amount: 72 }),
    ];

    const report = calculateVatReport(entries, accounts);
    const details = report.lines.find(
      (l) => l.id === 'domestic-sales-base',
    )!.details;

    expect(details[0].accountNumber).toBe('3100');
    expect(details[1].accountNumber).toBe('3200');
  });

  it("handles tax lines where the tax account doesn't exist in the account map", () => {
    const accounts = [
      account({
        id: 1,
        number: '3000',
        name: 'Myynti',
        type: 3,
        vat_code: 4,
        vat_percentage: 24,
        vat_account1_id: 999,
      }),
    ];
    const entries = [entry({ account_id: 1, debit: false, amount: 1000 })];

    const report = calculateVatReport(entries, accounts);

    expect(
      report.lines.find((l) => l.id === 'domestic-sales-tax')!.amount,
    ).toBe(0);
    expect(
      report.lines.find((l) => l.id === 'domestic-sales-tax')!.details,
    ).toHaveLength(0);
  });

  it('includes vatPercentage in base line details', () => {
    const accounts = [
      account({
        id: 1,
        number: '3000',
        name: 'Myynti 24%',
        type: 3,
        vat_code: 4,
        vat_percentage: 24,
        vat_account1_id: 101,
      }),
      account({ id: 101, number: '29391', name: 'Alv myynnistä', type: 1 }),
    ];
    const entries = [entry({ account_id: 1, debit: false, amount: 1000 })];

    const report = calculateVatReport(entries, accounts);
    const details = report.lines.find(
      (l) => l.id === 'domestic-sales-base',
    )!.details;

    expect(details[0].vatPercentage).toBe(24);
  });

  it('sets vatPercentage to null for zero-percentage base accounts', () => {
    const accounts = [
      account({
        id: 3,
        number: '3350',
        name: 'EU-myynti',
        type: 3,
        vat_code: 8,
        vat_percentage: 0,
      }),
    ];
    const entries = [entry({ account_id: 3, debit: false, amount: 300 })];

    const report = calculateVatReport(entries, accounts);
    const details = report.lines.find((l) => l.id === 'eu-sales-base')!.details;

    expect(details[0].vatPercentage).toBeNull();
  });
});

describe('buildVatSettlementPreview - branch coverage', () => {
  it('returns null when no settlement account exists', () => {
    const accounts = [
      account({
        id: 2,
        number: '29391',
        name: 'Alv myynnistä',
        type: 1,
        vat_code: 2,
      }),
    ];
    const entries = [entry({ account_id: 2, debit: false, amount: 240 })];

    expect(buildVatSettlementPreview(entries, accounts)).toBeNull();
  });

  it('returns null when VAT source accounts have no balance', () => {
    const accounts = [
      account({
        id: 1,
        number: '2939',
        name: 'ALV-velka',
        type: 1,
        vat_code: 1,
      }),
      account({
        id: 2,
        number: '29391',
        name: 'Alv myynnistä',
        type: 1,
        vat_code: 2,
      }),
    ];

    expect(buildVatSettlementPreview([], accounts)).toBeNull();
  });

  it('returns null when settlement balance rounds to zero', () => {
    const accounts = [
      account({
        id: 1,
        number: '2939',
        name: 'ALV-velka',
        type: 1,
        vat_code: 1,
      }),
      account({
        id: 2,
        number: '29391',
        name: 'Alv myynnistä',
        type: 1,
        vat_code: 2,
      }),
      account({
        id: 3,
        number: '29392',
        name: 'Alv ostoista',
        type: 1,
        vat_code: 3,
      }),
    ];
    const entries = [
      entry({ account_id: 2, debit: false, amount: 100 }),
      entry({ account_id: 3, debit: true, amount: 100 }),
    ];

    expect(buildVatSettlementPreview(entries, accounts)).toBeNull();
  });

  it('falls back to account 2939 when no vat_code=1 account exists', () => {
    const accounts = [
      account({
        id: 1,
        number: '2939',
        name: 'ALV-velka',
        type: 1,
        vat_code: 0,
      }),
      account({
        id: 2,
        number: '29391',
        name: 'Alv myynnistä',
        type: 1,
        vat_code: 2,
      }),
    ];
    const entries = [entry({ account_id: 2, debit: false, amount: 240 })];

    const preview = buildVatSettlementPreview(entries, accounts);

    expect(preview).not.toBeNull();
    expect(preview!.settlementAccountNumber).toBe('2939');
  });

  it('marks debit=true for positive balance (receivable)', () => {
    const accounts = [
      account({
        id: 1,
        number: '2939',
        name: 'ALV-velka',
        type: 1,
        vat_code: 1,
      }),
      account({
        id: 3,
        number: '29392',
        name: 'Alv ostoista',
        type: 1,
        vat_code: 3,
      }),
    ];
    const entries = [entry({ account_id: 3, debit: true, amount: 500 })];

    const preview = buildVatSettlementPreview(entries, accounts);

    expect(preview).not.toBeNull();
    expect(preview!.sourceLines[0].debit).toBe(false);
    expect(preview!.settlementDebit).toBe(true);
  });
});
