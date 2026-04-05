import { describe, expect, it } from 'vitest';
import {
  buildDischargeText,
  buildYhtiokokousPdf,
} from '@/lib/pdf/yhtiokokous-pdf';
import type { DischargeTarget, TilinpaatosPackage } from '@/lib/tilinpaatos';

function makePackage(
  overrides?: Partial<TilinpaatosPackage>,
): TilinpaatosPackage {
  return {
    companyName: 'Test Oy',
    businessId: '1234567-8',
    periodStart: '01.01.2025',
    periodEnd: '31.12.2025',
    balanceSheetRows: [],
    incomeStatementRows: [],
    notes: [],
    equity: {
      previousPeriodsProfit: 5000,
      currentPeriodProfit: 2000,
      distributableEquity: 7000,
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

describe('yhtiokokous pdf', () => {
  describe('buildDischargeText', () => {
    it('builds discharge text for all supported targets', () => {
      expect(buildDischargeText('board-and-ceo', '2.9.2024 - 31.12.2025')).toBe(
        'Päätettiin myöntää hallitukselle ja toimitusjohtajalle vastuuvapaus päättyneeltä tilikaudelta 2.9.2024 - 31.12.2025.',
      );
      expect(buildDischargeText('board', '1.1.2025 - 31.12.2025')).toBe(
        'Päätettiin myöntää hallitukselle vastuuvapaus päättyneeltä tilikaudelta 1.1.2025 - 31.12.2025.',
      );
      expect(buildDischargeText('ceo', '1.1.2025 - 31.12.2025')).toBe(
        'Päätettiin myöntää toimitusjohtajalle vastuuvapaus päättyneeltä tilikaudelta 1.1.2025 - 31.12.2025.',
      );
    });

    it('uses default for unknown target', () => {
      const result = buildDischargeText(
        'unknown' as unknown as DischargeTarget,
        '1.1. - 31.12.2025',
      );
      expect(result).toContain('hallitukselle ja toimitusjohtajalle');
    });
  });

  describe('buildYhtiokokousPdf', () => {
    it('builds a valid PDF buffer', async () => {
      const buffer = await buildYhtiokokousPdf(makePackage());
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('handles loss (negative profit)', async () => {
      const buffer = await buildYhtiokokousPdf(
        makePackage({
          equity: {
            previousPeriodsProfit: 1000,
            currentPeriodProfit: -500,
            distributableEquity: 500,
          },
        }),
      );
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('handles empty business ID', async () => {
      const buffer = await buildYhtiokokousPdf(makePackage({ businessId: '' }));
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('handles custom board proposal text', async () => {
      const buffer = await buildYhtiokokousPdf(
        makePackage({
          metadata: {
            place: 'Tampere',
            signatureDate: '2026-04-01',
            signerName: 'Matti Meikäläinen',
            signerTitle: 'toimitusjohtaja',
            meetingDate: '2026-04-01',
            boardProposal: 'Hallitus esittää, että voitto jaetaan osinkoina.',
            attendees: 'Matti Meikäläinen, Maija Meikäläinen',
            dischargeTarget: 'board-and-ceo',
          },
        }),
      );
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('handles empty signer name', async () => {
      const buffer = await buildYhtiokokousPdf(
        makePackage({
          metadata: {
            place: 'Helsinki',
            signatureDate: '2026-03-15',
            signerName: '',
            signerTitle: '',
            meetingDate: '',
            boardProposal: '',
            attendees: '',
            dischargeTarget: 'board',
          },
        }),
      );
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('formats same-year period correctly', async () => {
      const buffer = await buildYhtiokokousPdf(
        makePackage({
          periodStart: '01.01.2025',
          periodEnd: '31.12.2025',
        }),
      );
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('formats cross-year period correctly', async () => {
      const buffer = await buildYhtiokokousPdf(
        makePackage({
          periodStart: '02.09.2024',
          periodEnd: '31.12.2025',
        }),
      );
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });
});
