import { useMemo } from 'react';
import { resolveDocumentLabels } from '@/lib/document-labels';
import type { DocumentSummary } from '@/lib/documents-table';

export function useDocumentLabels(
  documentsState: DocumentSummary[],
  categoryValues: Record<number, string>,
  nameValues: Record<number, string>,
) {
  const savedLabelsByDocumentId = useMemo(
    () =>
      resolveDocumentLabels(
        documentsState.map((doc) => ({
          id: doc.id,
          number: doc.number,
          storedCategory: doc.category,
          storedName: doc.name,
          fallbackDescription: doc.entries[0]?.description ?? '',
        })),
      ),
    [documentsState],
  );

  const draftLabelsByDocumentId = useMemo(
    () =>
      resolveDocumentLabels(
        documentsState.map((doc) => ({
          id: doc.id,
          number: doc.number,
          storedCategory: categoryValues[doc.id] ?? doc.category,
          storedName: nameValues[doc.id] ?? doc.name,
          fallbackDescription: doc.entries[0]?.description ?? '',
        })),
      ),
    [categoryValues, documentsState, nameValues],
  );

  const documentsWithResolvedLabels = useMemo(
    () =>
      documentsState.map((doc) => {
        const label = savedLabelsByDocumentId.get(doc.id);
        if (!label) return doc;

        return {
          ...doc,
          category: label.category,
          name: label.name,
          code: label.code,
          description: label.description,
        };
      }),
    [documentsState, savedLabelsByDocumentId],
  );

  return {
    savedLabelsByDocumentId,
    draftLabelsByDocumentId,
    documentsWithResolvedLabels,
  };
}
