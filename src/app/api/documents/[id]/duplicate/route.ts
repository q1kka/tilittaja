import { NextRequest, NextResponse } from 'next/server';
import { duplicateDocumentAction } from '@/actions/app-actions';
import { jsonActionError, requireRouteId } from '@/lib/api-helpers';
import type { RouteIdParams } from '@/lib/types';

export async function POST(
  _request: NextRequest,
  { params }: RouteIdParams,
) {
  try {
    const documentId = await requireRouteId(params, 'tositteen tunniste');
    const payload = await duplicateDocumentAction(documentId);
    return NextResponse.json(payload);
  } catch (error) {
    return jsonActionError(error, 'Tositteen kopiointi epäonnistui');
  }
}
