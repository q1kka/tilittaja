import { NextRequest, NextResponse } from 'next/server';
import {
  deleteDocumentAction,
  updateDocumentAction,
} from '@/actions/app-actions';
import { jsonActionError, requireRouteId } from '@/lib/api-helpers';
import type { RouteIdParams } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: RouteIdParams,
) {
  try {
    const documentId = await requireRouteId(params, 'tositteen tunniste');
    const body = await request.json();
    const document = await updateDocumentAction(documentId, body);
    return NextResponse.json(document);
  } catch (error) {
    return jsonActionError(error, 'Tositteen päivitys epäonnistui');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteIdParams,
) {
  try {
    const documentId = await requireRouteId(params, 'tositteen tunniste');
    const result = await deleteDocumentAction(documentId);
    return NextResponse.json(result);
  } catch (error) {
    return jsonActionError(error, 'Tositteen poisto epäonnistui');
  }
}
