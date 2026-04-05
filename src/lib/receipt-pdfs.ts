import fs from 'fs';
import path from 'path';
import { getEnv } from '@/lib/env';

export interface ReceiptIndex {
  byNumber: Map<number, string[]>;
  unmatched: string[];
}

export type ReceiptSource = 'manual' | 'automatic' | null;

const RECEIPT_FILE_NAME_PATTERN = /^MU(?:\s*-\s*|\s*)0*(\d+)\.pdf$/i;
const RECEIPT_REFERENCE_PATTERN = /\bMU(?:\s*-\s*|\s*)0*(\d+)\b/gi;

function resolveConfiguredPdfRoot(): string | null {
  const configuredRoot = getEnv().RECEIPT_PDF_ROOT;
  if (!configuredRoot) return null;

  return path.isAbsolute(configuredRoot)
    ? path.normalize(configuredRoot)
    : path.resolve(
        /* turbopackIgnore: true */ process.cwd(),
        configuredRoot,
      );
}

export function getPdfRoot(source: string): string {
  return (
    resolveConfiguredPdfRoot() ??
    path.resolve(
      /* turbopackIgnore: true */ process.cwd(),
      '..',
      'data',
      source,
      'pdf',
    )
  );
}

export function getDataSourceRoot(source: string): string {
  return path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    '..',
    'data',
    source,
  );
}

export function getReceiptsRoot(source: string): string {
  return path.join(getPdfRoot(source), 'tositteet');
}

export function collectPdfFiles(
  dirPath: string,
  rootPath: string,
  files: string[],
): void {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolute = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectPdfFiles(absolute, rootPath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith('.pdf')) continue;
    files.push(path.relative(rootPath, absolute));
  }
}

export function listPdfFiles(pdfRoot: string): string[] {
  const files: string[] = [];
  collectPdfFiles(pdfRoot, pdfRoot, files);
  return files.sort((a, b) => a.localeCompare(b, 'fi'));
}

export function buildReceiptIndex(receiptsRoot: string): ReceiptIndex {
  const allPdfFiles = listPdfFiles(receiptsRoot);
  const byNumber = new Map<number, string[]>();
  const unmatched: string[] = [];

  for (const relativePath of allPdfFiles) {
    const fileName = path.basename(relativePath);
    const match = fileName.match(RECEIPT_FILE_NAME_PATTERN);
    if (!match) {
      unmatched.push(relativePath);
      continue;
    }

    const number = Number(match[1]);
    const current = byNumber.get(number) ?? [];
    current.push(relativePath);
    byNumber.set(number, current);
  }

  return { byNumber, unmatched };
}

export function extractReceiptNumbersFromText(text: string): number[] {
  if (!text || typeof text !== 'string') return [];

  const matches = [...text.matchAll(RECEIPT_REFERENCE_PATTERN)];
  const numbers: number[] = [];
  const seen = new Set<number>();

  for (const match of matches) {
    const number = Number(match[1]);
    if (!Number.isInteger(number) || number <= 0 || seen.has(number)) continue;
    seen.add(number);
    numbers.push(number);
  }

  return numbers;
}

export function getAutomaticReceiptPaths(params: {
  documentNumber: number;
  entryDescriptions: string[];
  receiptIndex: ReceiptIndex;
}): string[] {
  const candidateNumbers: number[] = [];
  const seen = new Set<number>();

  for (const description of params.entryDescriptions) {
    for (const number of extractReceiptNumbersFromText(description)) {
      if (seen.has(number)) continue;
      seen.add(number);
      candidateNumbers.push(number);
    }
  }

  if (
    Number.isInteger(params.documentNumber) &&
    params.documentNumber > 0 &&
    !seen.has(params.documentNumber)
  ) {
    candidateNumbers.push(params.documentNumber);
  }

  return candidateNumbers.flatMap(
    (number) => params.receiptIndex.byNumber.get(number) ?? [],
  );
}

export function resolvePdfRelativePath(
  pdfRoot: string,
  relativePath: string,
): string | null {
  if (!relativePath || typeof relativePath !== 'string') return null;

  const normalizedRoot = path.resolve(pdfRoot);
  const absolutePath = path.resolve(normalizedRoot, relativePath);
  const relativeToRoot = path.relative(normalizedRoot, absolutePath);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot))
    return null;
  if (!absolutePath.toLowerCase().endsWith('.pdf')) return null;

  try {
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) return null;
  } catch {
    return null;
  }

  return path.normalize(relativeToRoot);
}

function resolveExistingPdfAbsolutePath(absolutePath: string): string | null {
  if (!absolutePath.toLowerCase().endsWith('.pdf')) return null;

  try {
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) return null;
    return path.normalize(absolutePath);
  } catch {
    return null;
  }
}

export function findPdfByFileName(
  searchRoot: string,
  fileName: string,
): string | null {
  if (!fileName || typeof fileName !== 'string') return null;

  const targetName = path.basename(fileName).trim();
  if (!targetName.toLowerCase().endsWith('.pdf')) return null;
  if (!fs.existsSync(searchRoot)) return null;

  const candidates = [
    path.join(searchRoot, targetName),
    path.join(searchRoot, 'tiliotteet', targetName),
  ];

  for (const candidate of candidates) {
    const resolved = resolveExistingPdfAbsolutePath(candidate);
    if (resolved) return resolved;
  }

  const relativeMatches = listPdfFiles(searchRoot);
  for (const relativePath of relativeMatches) {
    if (path.basename(relativePath).toLowerCase() !== targetName.toLowerCase())
      continue;
    const resolved = resolveExistingPdfAbsolutePath(
      path.join(searchRoot, relativePath),
    );
    if (resolved) return resolved;
  }

  return null;
}

export function resolveBankStatementPdfAbsolutePath(
  source: string,
  sourceFile: string,
): string | null {
  const fileName = path.basename(sourceFile).trim();
  if (!fileName) return null;

  const searchRoots = [
    path.join(getPdfRoot(source), 'tiliotteet'),
    getPdfRoot(source),
    getDataSourceRoot(source),
  ];

  for (const searchRoot of searchRoots) {
    const resolved = findPdfByFileName(searchRoot, fileName);
    if (resolved) return resolved;
  }

  return null;
}

export function chooseDocumentReceipt(params: {
  manualPath: string | null;
  automaticPaths: string[];
  pdfRoot: string;
  receiptsRoot: string;
}): { path: string | null; source: ReceiptSource } {
  if (params.manualPath !== null && params.manualPath.trim() === '') {
    return { path: null, source: null };
  }

  const manualPath = params.manualPath
    ? resolvePdfRelativePath(params.pdfRoot, params.manualPath)
    : null;

  if (manualPath) {
    return { path: manualPath, source: 'manual' };
  }

  for (const automaticPath of params.automaticPaths) {
    const resolved = resolvePdfRelativePath(params.receiptsRoot, automaticPath);
    if (resolved) {
      return {
        path: path.normalize(path.join('tositteet', resolved)),
        source: 'automatic',
      };
    }
  }

  return { path: null, source: null };
}
