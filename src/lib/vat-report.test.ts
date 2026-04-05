import { describe, expect, it } from 'vitest';
import {
  buildVatSettlementPreview,
  calculateVatReport,
} from '@/lib/vat-report';
import { account, entry } from '@/lib/test-helpers';

describe('calculateVatReport', () => {
  it('builds VAT return totals from vat codes and linked VAT accounts', () => {
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
      account({
        id: 2,
        number: '4000',
        name: 'Ostot',
        type: 4,
        vat_code: 5,
        vat_percentage: 24,
        vat_account1_id: 102,
      }),
      account({
        id: 3,
        number: '3350',
        name: 'EU-myynti',
        type: 3,
        vat_code: 8,
        vat_percentage: 0,
      }),
      account({
        id: 4,
        number: '4475',
        name: 'EU-osto',
        type: 4,
        vat_code: 9,
        vat_percentage: 24,
        vat_account1_id: 104,
        vat_account2_id: 103,
      }),
      account({
        id: 5,
        number: '3110',
        name: 'Rakennusmyynti',
        type: 3,
        vat_code: 10,
        vat_percentage: 0,
      }),
      account({
        id: 6,
        number: '4470',
        name: 'Rakennusosto',
        type: 4,
        vat_code: 11,
        vat_percentage: 24,
        vat_account1_id: 106,
        vat_account2_id: 105,
      }),
      account({ id: 101, number: '29391', name: 'Alv myynnistä', type: 1 }),
      account({ id: 102, number: '29392', name: 'Alv ostoista', type: 1 }),
      account({
        id: 103,
        number: '29393',
        name: 'Alv suoritettava EU-ostoista',
        type: 1,
      }),
      account({
        id: 104,
        number: '29394',
        name: 'Alv vähennettävä EU-ostoista',
        type: 1,
      }),
      account({
        id: 105,
        number: '29395',
        name: 'Alv suoritettava rak.palveluista',
        type: 1,
      }),
      account({
        id: 106,
        number: '29396',
        name: 'Alv vähennettävä rak.palveluista',
        type: 1,
      }),
    ];

    const entries = [
      entry({ account_id: 1, debit: false, amount: 1000 }),
      entry({ account_id: 101, debit: false, amount: 240 }),
      entry({ account_id: 2, debit: true, amount: 500 }),
      entry({ account_id: 102, debit: true, amount: 120 }),
      entry({ account_id: 3, debit: false, amount: 300 }),
      entry({ account_id: 4, debit: true, amount: 400 }),
      entry({ account_id: 103, debit: false, amount: 96 }),
      entry({ account_id: 104, debit: true, amount: 96 }),
      entry({ account_id: 5, debit: false, amount: 200 }),
      entry({ account_id: 6, debit: true, amount: 250 }),
      entry({ account_id: 105, debit: false, amount: 60 }),
      entry({ account_id: 106, debit: true, amount: 60 }),
    ];

    const report = calculateVatReport(entries, accounts);

    expect(
      report.lines.find((line) => line.id === 'domestic-sales-base')?.amount,
    ).toBe(1000);
    expect(
      report.lines.find((line) => line.id === 'domestic-sales-tax')?.amount,
    ).toBe(240);
    expect(
      report.lines.find(
        (line) => line.id === 'domestic-purchases-deductible-tax',
      )?.amount,
    ).toBe(120);
    expect(
      report.lines.find((line) => line.id === 'eu-sales-base')?.amount,
    ).toBe(300);
    expect(
      report.lines.find((line) => line.id === 'eu-purchases-base')?.amount,
    ).toBe(400);
    expect(
      report.lines.find((line) => line.id === 'eu-purchases-output-tax')
        ?.amount,
    ).toBe(96);
    expect(
      report.lines.find((line) => line.id === 'eu-purchases-deductible-tax')
        ?.amount,
    ).toBe(96);
    expect(
      report.lines.find((line) => line.id === 'construction-sales-base')
        ?.amount,
    ).toBe(200);
    expect(
      report.lines.find(
        (line) => line.id === 'construction-purchases-output-tax',
      )?.amount,
    ).toBe(60);
    expect(
      report.lines.find(
        (line) => line.id === 'construction-purchases-deductible-tax',
      )?.amount,
    ).toBe(60);

    expect(report.totals.salesBase).toBe(1500);
    expect(report.totals.purchaseBase).toBe(1150);
    expect(report.totals.outputVat).toBe(396);
    expect(report.totals.deductibleVat).toBe(276);
    expect(report.totals.payableVat).toBe(120);
    expect(report.totals.receivableVat).toBe(0);
  });

  it('builds settlement entries that zero VAT accounts into the settlement account', () => {
    const accounts = [
      account({
        id: 1,
        number: '2939',
        name: 'Arvonlisäverovelka',
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
      account({
        id: 4,
        number: '29393',
        name: 'Alv suoritettava EU-ostoista',
        type: 1,
        vat_code: 2,
      }),
    ];

    const entries = [
      entry({ account_id: 2, debit: false, amount: 240 }),
      entry({ account_id: 3, debit: true, amount: 120 }),
      entry({ account_id: 4, debit: false, amount: 96 }),
    ];

    const preview = buildVatSettlementPreview(entries, accounts);

    expect(preview).not.toBeNull();
    expect(preview?.settlementAccountNumber).toBe('2939');
    expect(preview?.settlementDebit).toBe(false);
    expect(preview?.settlementAmount).toBe(216);
    expect(preview?.sourceLines).toEqual([
      {
        accountId: 2,
        accountNumber: '29391',
        accountName: 'Alv myynnistä',
        balance: 240,
        debit: true,
        amount: 240,
      },
      {
        accountId: 3,
        accountNumber: '29392',
        accountName: 'Alv ostoista',
        balance: -120,
        debit: false,
        amount: 120,
      },
      {
        accountId: 4,
        accountNumber: '29393',
        accountName: 'Alv suoritettava EU-ostoista',
        balance: 96,
        debit: true,
        amount: 96,
      },
    ]);
  });
});
