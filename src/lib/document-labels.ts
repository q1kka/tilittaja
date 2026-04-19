interface ResolveDocumentLabelInput {
  number: number;
  displayNumber?: number;
  storedCategory?: string | null;
  storedName?: string | null;
  fallbackDescription?: string | null;
}

interface ResolveDocumentLabelsInput extends ResolveDocumentLabelInput {
  id: number;
}

interface ParsedLegacyLabel {
  category: string;
  name: string;
}

interface ResolvedDocumentLabel {
  category: string;
  name: string;
  code: string;
  description: string;
}

const LEGACY_DOCUMENT_LABEL_PATTERN =
  /^\s*([A-ZÅÄÖ]{1,4})\s*-?\s*0*(\d+)\s*[:\-]?\s*(.*)$/i;

function parseLegacyDocumentLabel(
  description: string | null | undefined,
  documentNumber: number,
): ParsedLegacyLabel | null {
  if (!description) return null;

  const match = description.match(LEGACY_DOCUMENT_LABEL_PATTERN);
  if (!match) return null;

  const parsedNumber = Number(match[2]);
  if (!Number.isInteger(parsedNumber) || parsedNumber !== documentNumber) {
    return null;
  }

  return {
    category: match[1].toUpperCase(),
    name: match[3]?.trim() ?? '',
  };
}

export function buildDocumentCode(
  category: string,
  documentNumber: number,
): string {
  const trimmedCategory = category.trim().toUpperCase();
  if (!trimmedCategory) return String(documentNumber);
  return `${trimmedCategory}-${documentNumber}`;
}

function resolveDocumentLabelContent({
  number,
  storedCategory,
  storedName,
  fallbackDescription,
}: ResolveDocumentLabelInput): Omit<ResolvedDocumentLabel, 'code'> {
  const parsedLegacy = parseLegacyDocumentLabel(fallbackDescription, number);
  const category = (
    storedCategory?.trim() ||
    parsedLegacy?.category ||
    'MU'
  ).toUpperCase();
  const name =
    storedName?.trim() ||
    parsedLegacy?.name ||
    fallbackDescription?.trim() ||
    '';

  return {
    category,
    name,
    description: name,
  };
}

export function resolveDocumentLabel({
  number,
  displayNumber,
  storedCategory,
  storedName,
  fallbackDescription,
}: ResolveDocumentLabelInput): ResolvedDocumentLabel {
  const resolved = resolveDocumentLabelContent({
    number,
    storedCategory,
    storedName,
    fallbackDescription,
  });
  const code = buildDocumentCode(resolved.category, displayNumber ?? number);

  return {
    category: resolved.category,
    name: resolved.name,
    code,
    description: resolved.description || code,
  };
}

export function resolveDocumentLabels(
  documents: ResolveDocumentLabelsInput[],
): Map<number, ResolvedDocumentLabel> {
  const labels = new Map<number, ResolvedDocumentLabel>();
  const categoryCounts = new Map<string, number>();
  const sortedDocuments = [...documents].sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    return a.id - b.id;
  });

  for (const document of sortedDocuments) {
    const resolved = resolveDocumentLabelContent(document);
    const nextDisplayNumber = (categoryCounts.get(resolved.category) ?? 0) + 1;
    categoryCounts.set(resolved.category, nextDisplayNumber);

    labels.set(document.id, {
      category: resolved.category,
      name: resolved.name,
      code: buildDocumentCode(resolved.category, nextDisplayNumber),
      description:
        resolved.description ||
        buildDocumentCode(resolved.category, nextDisplayNumber),
    });
  }

  return labels;
}
