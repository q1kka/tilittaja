'use client';

import {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react';

export type DocumentColumnKey =
  | 'number'
  | 'date'
  | 'description'
  | 'receipt'
  | 'statement'
  | 'amount';
export type DocumentColumnWidths = Record<DocumentColumnKey, number>;

const DOCUMENT_COLUMN_DEFAULT_WIDTHS: DocumentColumnWidths = {
  number: 72,
  date: 100,
  description: 280,
  receipt: 104,
  statement: 180,
  amount: 130,
};

const DOCUMENT_COLUMN_MIN_WIDTHS: DocumentColumnWidths = {
  number: 60,
  date: 88,
  description: 180,
  receipt: 88,
  statement: 140,
  amount: 104,
};

const DOCUMENT_COLUMN_STORAGE_KEY = 'documents-table-column-widths';
export const DOCUMENT_EXPAND_COLUMN_WIDTH = 32;

function clampDocumentColumnWidth(key: DocumentColumnKey, width: number) {
  return Math.max(DOCUMENT_COLUMN_MIN_WIDTHS[key], Math.round(width));
}

function getStoredDocumentColumnWidth(
  widths: Partial<Record<DocumentColumnKey, number>> | null | undefined,
  key: DocumentColumnKey,
) {
  const value = widths?.[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? clampDocumentColumnWidth(key, value)
    : DOCUMENT_COLUMN_DEFAULT_WIDTHS[key];
}

export function useColumnResize() {
  const [columnWidths, setColumnWidths] = useState<DocumentColumnWidths>(
    DOCUMENT_COLUMN_DEFAULT_WIDTHS,
  );
  const [columnWidthsReady, setColumnWidthsReady] = useState(false);
  const columnResizeStateRef = useRef<{
    key: DocumentColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  const documentsTableMinWidth = useMemo(
    () =>
      DOCUMENT_EXPAND_COLUMN_WIDTH +
      Object.values(columnWidths).reduce((sum, width) => sum + width, 0),
    [columnWidths],
  );

  const updateColumnWidth = useCallback(
    (key: DocumentColumnKey, width: number) => {
      const nextWidth = clampDocumentColumnWidth(key, width);
      setColumnWidths((prev) =>
        prev[key] === nextWidth ? prev : { ...prev, [key]: nextWidth },
      );
    },
    [],
  );

  const resetColumnWidth = useCallback((key: DocumentColumnKey) => {
    setColumnWidths((prev) => {
      const nextWidth = DOCUMENT_COLUMN_DEFAULT_WIDTHS[key];
      return prev[key] === nextWidth ? prev : { ...prev, [key]: nextWidth };
    });
  }, []);

  const stopColumnResize = useCallback(() => {
    if (columnResizeStateRef.current == null) return;
    columnResizeStateRef.current = null;
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  }, []);

  const startColumnResize = useCallback(
    (key: DocumentColumnKey) => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      columnResizeStateRef.current = {
        key,
        startX: event.clientX,
        startWidth: columnWidths[key],
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [columnWidths],
  );

  useEffect(() => {
    try {
      const storedWidths = window.localStorage.getItem(
        DOCUMENT_COLUMN_STORAGE_KEY,
      );
      if (storedWidths) {
        const parsed = JSON.parse(storedWidths) as Partial<
          Record<DocumentColumnKey, number>
        >;
        setColumnWidths({
          number: getStoredDocumentColumnWidth(parsed, 'number'),
          date: getStoredDocumentColumnWidth(parsed, 'date'),
          description: getStoredDocumentColumnWidth(parsed, 'description'),
          receipt: getStoredDocumentColumnWidth(parsed, 'receipt'),
          statement: getStoredDocumentColumnWidth(parsed, 'statement'),
          amount: getStoredDocumentColumnWidth(parsed, 'amount'),
        });
      }
    } catch {
      // Ignore malformed stored widths and fall back to defaults.
    } finally {
      setColumnWidthsReady(true);
    }
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = columnResizeStateRef.current;
      if (!resizeState) return;

      updateColumnWidth(
        resizeState.key,
        resizeState.startWidth + (event.clientX - resizeState.startX),
      );
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopColumnResize);
    window.addEventListener('pointercancel', stopColumnResize);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopColumnResize);
      window.removeEventListener('pointercancel', stopColumnResize);
    };
  }, [stopColumnResize, updateColumnWidth]);

  useEffect(() => {
    if (!columnWidthsReady) return;

    window.localStorage.setItem(
      DOCUMENT_COLUMN_STORAGE_KEY,
      JSON.stringify(columnWidths),
    );
  }, [columnWidths, columnWidthsReady]);

  return {
    columnWidths,
    columnWidthsReady,
    documentsTableMinWidth,
    startColumnResize,
    resetColumnWidth,
    DOCUMENT_EXPAND_COLUMN_WIDTH,
  };
}
