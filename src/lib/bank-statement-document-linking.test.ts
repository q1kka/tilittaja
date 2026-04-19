import { describe, expect, it } from 'vitest';
import {
  buildCandidateDocumentsForEntries,
  buildSuggestionPromptPayload,
  type BankStatementSuggestionDocumentInput,
  type BankStatementSuggestionEntryInput,
} from '@/lib/bank-statement-document-linking';

function createEntry(overrides: Partial<BankStatementSuggestionEntryInput> = {}) {
  return {
    id: 1,
    entryDate: Date.UTC(2025, 0, 7),
    amount: -641.8,
    counterparty: 'Asunto Oy Jyvaskylan Roninmaen Lauri/A',
    reference: null,
    message: 'E-lasku / e-faktura',
    ...overrides,
  };
}

function createDocument(
  overrides: Partial<BankStatementSuggestionDocumentInput> = {},
): BankStatementSuggestionDocumentInput {
  return {
    id: 10,
    number: 200,
    date: Date.UTC(2025, 0, 7),
    category: 'MU',
    name: 'Asunto Oy Jyvaskylan Roninmaen Lauri/A',
    totalDebit: 641.8,
    totalCredit: 641.8,
    descriptions: ['Roninmaen Lauri/A vastike'],
    ...overrides,
  };
}

describe('buildCandidateDocumentsForEntries', () => {
  it('narrows to the strongest same-month match when it clearly stands out', () => {
    const entry = createEntry();
    const bestDocument = createDocument({ id: 1, number: 11 });
    const weakerDocument = createDocument({
      id: 2,
      number: 12,
      date: Date.UTC(2025, 1, 1),
      name: 'Muu vastike',
      descriptions: ['Satunnainen kulu'],
    });
    const unrelatedDocument = createDocument({
      id: 3,
      number: 13,
      totalDebit: 999,
      totalCredit: 999,
      name: 'Sahkolasku',
      descriptions: ['Kuukauden sahkolasku'],
    });

    const candidates = buildCandidateDocumentsForEntries(entry ? [entry] : [], [
      unrelatedDocument,
      weakerDocument,
      bestDocument,
    ]);

    expect(candidates.get(entry.id)?.map((document) => document.id)).toEqual([1]);
  });

  it('keeps the closest same-month candidate for amount-only recurring matches', () => {
    const entry = createEntry({
      amount: 150.75,
      counterparty: 'Pajukoski Sini Irina',
      message: 'Not provided',
    });
    const closeDocument = createDocument({
      id: 4,
      totalDebit: 150.75,
      totalCredit: 150.75,
      date: Date.UTC(2025, 0, 16),
      name: 'Laina',
      descriptions: ['Siirto'],
    });
    const laterDocument = createDocument({
      id: 5,
      totalDebit: 150.75,
      totalCredit: 150.75,
      date: Date.UTC(2025, 2, 16),
      name: 'Laina 2',
      descriptions: ['Siirto 2'],
    });

    const candidates = buildCandidateDocumentsForEntries([entry], [
      laterDocument,
      closeDocument,
    ]);

    expect(candidates.get(entry.id)?.map((document) => document.id)).toEqual([4]);
  });

  it('prefers same-month recurring document variants over earlier months', () => {
    const entry = createEntry({
      entryDate: Date.UTC(2025, 1, 3),
      amount: -550,
      counterparty: 'Kotanen Juho Urmas Joonata',
      message: 'VUOKRA',
    });
    const januaryDocument = createDocument({
      id: 21,
      number: 2,
      date: Date.UTC(2025, 0, 5),
      name: 'Roninmäentie 6 K A 6 vuokra, tammikuu 2025',
      descriptions: ['Roninmäentie 6 K A 6 vuokra, tammikuu 2025'],
      totalDebit: 550,
      totalCredit: 550,
    });
    const februaryDocument = createDocument({
      id: 22,
      number: 23,
      date: Date.UTC(2025, 1, 1),
      name: 'Roninmäentie 6 K A 6 vuokra, helmikuu 2025',
      descriptions: ['Roninmäentie 6 K A 6 vuokra, helmikuu 2025'],
      totalDebit: 550,
      totalCredit: 550,
    });

    const candidates = buildCandidateDocumentsForEntries([entry], [
      januaryDocument,
      februaryDocument,
    ]);

    expect(candidates.get(entry.id)?.map((document) => document.id)).toEqual([22]);
  });
});

describe('buildSuggestionPromptPayload', () => {
  it('includes earlier resolved links as prompt examples', () => {
    const entry = createEntry();
    const document = createDocument({ id: 7, number: 42 });
    const payload = buildSuggestionPromptPayload({
      statement: {
        id: 99,
        accountNumber: 'FI00',
        accountName: 'Pankkitili',
        periodStart: Date.UTC(2025, 1, 1),
        periodEnd: Date.UTC(2025, 1, 28),
      },
      entries: [entry],
      candidatesByEntryId: new Map([[entry.id, [document]]]),
      previousLinkExamples: [
        {
          entryDate: Date.UTC(2025, 0, 7),
          amount: -641.8,
          counterparty: 'Asunto Oy Jyvaskylan Roninmaen Lauri/A',
          reference: null,
          message: 'E-lasku / e-faktura',
          documentId: 6,
          documentNumber: 41,
          documentDate: Date.UTC(2025, 0, 7),
          documentCategory: 'MU',
          documentName: 'Roninmaen vastike',
          documentDescriptions: ['Roninmaen Lauri/A vastike'],
        },
      ],
    });

    expect(payload.previousResolvedLinks).toEqual([
      {
        date: '2025-01-07',
        amount: -641.8,
        counterparty: 'Asunto Oy Jyvaskylan Roninmaen Lauri/A',
        reference: null,
        message: 'E-lasku / e-faktura',
        linkedDocument: {
          documentId: 6,
          number: 41,
          date: '2025-01-07',
          category: 'MU',
          name: 'Roninmaen vastike',
          descriptions: ['Roninmaen Lauri/A vastike'],
        },
      },
    ]);
    expect(payload.entries[0]?.candidates[0]?.documentId).toBe(7);
  });
});
