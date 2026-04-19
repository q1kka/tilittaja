import { describe, expect, it } from 'vitest';

import { buildBankStatementDocumentOptions } from '@/lib/bank-statement-document-options';

describe('buildBankStatementDocumentOptions', () => {
  it('prefers stored document names over first entry descriptions', () => {
    const options = buildBankStatementDocumentOptions({
      documents: [
        {
          id: 30,
          number: 30,
          period_id: 1,
          date: Date.UTC(2025, 9, 1),
        },
      ],
      metadataMap: new Map([
        [
          30,
          {
            document_id: 30,
            category: 'MU',
            name: 'Helmi Kiviniemi Valssikuja 2A1 vuokrasopimus',
          },
        ],
      ]),
      firstEntryDescriptionByDocumentId: new Map([
        [30, '1700 Siirtosaamiset'],
      ]),
      receiptMap: new Map([[30, { path: 'tositteet/MU-30.pdf', source: 'manual' }]]),
    });

    expect(options).toEqual([
      {
        id: 30,
        number: 30,
        date: Date.UTC(2025, 9, 1),
        description: 'Helmi Kiviniemi Valssikuja 2A1 vuokrasopimus',
        receiptPath: 'tositteet/MU-30.pdf',
        receiptSource: 'manual',
      },
    ]);
  });

  it('falls back to the first entry description when metadata is missing', () => {
    const options = buildBankStatementDocumentOptions({
      documents: [
        {
          id: 5,
          number: 5,
          period_id: 1,
          date: Date.UTC(2025, 0, 1),
        },
      ],
      metadataMap: new Map(),
      firstEntryDescriptionByDocumentId: new Map([[5, 'Valssikuja AP']]),
      receiptMap: new Map(),
    });

    expect(options[0]).toMatchObject({
      id: 5,
      description: 'Valssikuja AP',
      receiptPath: null,
      receiptSource: null,
    });
  });
});
