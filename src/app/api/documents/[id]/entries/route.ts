import { NextRequest, NextResponse } from 'next/server';
import { saveDocumentEntriesAction } from '@/actions/app-actions';
import { jsonActionError, requireRouteId } from '@/lib/api-helpers';
import type { RouteIdParams } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: RouteIdParams,
) {
  try {
    const documentId = await requireRouteId(params, 'tositteen tunniste');
    const body = await request.json().catch(() => null);
    const payload = await saveDocumentEntriesAction(documentId, body);
    return NextResponse.json(payload);
  } catch (error) {
    return jsonActionError(error, 'Vientien summien päivitys epäonnistui');
  }
}
