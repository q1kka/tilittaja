export function buildDocumentListHref(
  documentId: number,
  periodId?: number | null,
): string {
  const params = new URLSearchParams({ document: String(documentId) });
  if (periodId != null) {
    params.set('period', String(periodId));
  }

  return `/documents?${params.toString()}`;
}
