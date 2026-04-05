import { describe, expect, it } from 'vitest';
import { buildTilinpaatosPdf } from './tilinpaatos-pdf';
import type { TilinpaatosPackage, TilinpaatosRow } from '@/lib/tilinpaatos';

function makePackage(
  overrides?: Partial<TilinpaatosPackage>,
): TilinpaatosPackage {
  return {
    companyName: 'Test Oy',
    businessId: '1234567-8',
    periodStart: '01.01.2025',
    periodEnd: '31.12.2025',
    balanceSheetRows: [
      {
        type: 'H',
        style: 'B',
        level: 0,
        accountRanges: [],
        label: 'TASE',
        visible: true,
      },
      {
        type: 'S',
        style: 'P',
        level: 1,
        accountRanges: [[1000, 2000]],
        label: 'Vastaavaa',
        visible: true,
        amount: 5000,
      },
      {
        type: '-',
        style: 'P',
        level: 0,
        accountRanges: [],
        label: '',
        visible: true,
      },
    ],
    incomeStatementRows: [
      {
        type: 'H',
        style: 'B',
        level: 0,
        accountRanges: [],
        label: 'TULOSLASKELMA',
        visible: true,
      },
      {
        type: 'S',
        style: 'P',
        level: 1,
        accountRanges: [[3000, 4000]],
        label: 'Liikevaihto',
        visible: true,
        amount: 10000,
      },
    ],
    notes: ['Tilinpäätös on laadittu.', 'Ei oleellisia muutoksia.'],
    equity: {
      previousPeriodsProfit: 1000,
      currentPeriodProfit: 2000,
      distributableEquity: 3000,
    },
    metadata: {
      place: 'Helsinki',
      signatureDate: '2026-03-15',
      signerName: 'Testi Henkilö',
      signerTitle: 'Hallituksen jäsen',
      meetingDate: '2026-03-15',
      boardProposal: '',
      attendees: '',
      dischargeTarget: 'board',
    },
    ...overrides,
  };
}

describe('tilinpaatos-pdf', () => {
  it('builds a PDF buffer from a complete package', async () => {
    const buffer = await buildTilinpaatosPdf(makePackage());
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('handles empty business ID', async () => {
    const buffer = await buildTilinpaatosPdf(makePackage({ businessId: '' }));
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles empty notes array', async () => {
    const buffer = await buildTilinpaatosPdf(makePackage({ notes: [] }));
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('renders rows with different types correctly', async () => {
    const buffer = await buildTilinpaatosPdf(
      makePackage({
        balanceSheetRows: [
          {
            type: 'H',
            style: 'B',
            level: 0,
            accountRanges: [],
            label: 'Header',
            visible: true,
          },
          {
            type: 'G',
            style: 'P',
            level: 1,
            accountRanges: [],
            label: 'Group',
            visible: true,
          },
          {
            type: 'S',
            style: 'B',
            level: 1,
            accountRanges: [[1000, 2000]],
            label: 'Sum',
            visible: true,
            amount: 500,
          },
          {
            type: '-',
            style: 'P',
            level: 0,
            accountRanges: [],
            label: '',
            visible: true,
          },
          {
            type: 'S',
            style: 'P',
            level: 0,
            accountRanges: [],
            label: 'Hidden',
            visible: false,
          },
        ],
      }),
    );
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('includes previous amounts when provided', async () => {
    const buffer = await buildTilinpaatosPdf(
      makePackage({
        balanceSheetRows: [
          {
            type: 'S',
            style: 'P',
            level: 0,
            label: 'With comparison',
            visible: true,
            currentAmount: 1000,
            previousAmount: 800,
          } satisfies TilinpaatosRow,
        ],
      }),
    );
    expect(buffer).toBeInstanceOf(Buffer);
  });
});
