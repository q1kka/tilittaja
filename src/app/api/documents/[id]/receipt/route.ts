import { NextRequest, NextResponse } from 'next/server';
import {
  withDb,
  requireRouteId,
  jsonError,
  jsonActionError,
} from '@/lib/api-helpers';
import type { RouteIdParams } from '@/lib/types';
import {
  deleteDocumentReceiptAction,
  updateDocumentReceiptAction,
  uploadDocumentReceiptAction,
} from '@/actions/app-actions';

export const runtime = 'nodejs';

export const PATCH = withDb(
  async (request: NextRequest, { params }: RouteIdParams) => {
    try {
      const documentId = await requireRouteId(params, 'tositteen tunniste');
      const body = await request.json().catch(() => null);
      const result = await updateDocumentReceiptAction(documentId, {
        receiptPath: body?.receiptPath,
      });
      return NextResponse.json(result);
    } catch (error) {
      return jsonActionError(error, 'PDF-linkityksen tallennus epäonnistui');
    }
  },
  'PDF-linkityksen tallennus epäonnistui',
);

export const POST = withDb(
  async (request: NextRequest, { params }: RouteIdParams) => {
    try {
      const documentId = await requireRouteId(params, 'tositteen tunniste');
      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return jsonError('Lähetä PDF multipart-lomakkeena', 400);
      }

      const formData = await request.formData().catch(() => null);
      if (!formData) {
        return jsonError('Virheellinen lomakedata', 400);
      }

      const file = formData.get('file');
      if (!(file instanceof File)) {
        return jsonError('Lähetä yksi PDF-tiedosto kentässä `file`', 400);
      }

      const result = await uploadDocumentReceiptAction(documentId, file);
      return NextResponse.json(result);
    } catch (error) {
      return jsonActionError(error, 'PDF-upload epäonnistui');
    }
  },
  'PDF-upload epäonnistui',
);

export const DELETE = withDb(
  async (request: NextRequest, { params }: RouteIdParams) => {
    void request;
    try {
      const documentId = await requireRouteId(params, 'tositteen tunniste');
      const result = await deleteDocumentReceiptAction(documentId);
      return NextResponse.json(result);
    } catch (error) {
      return jsonActionError(error, 'PDF-liitteen poisto epäonnistui');
    }
  },
  'PDF-liitteen poisto epäonnistui',
);
