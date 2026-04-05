import { NextRequest, NextResponse } from 'next/server';
import { createBankStatementDocumentsAction } from '@/actions/app-actions';
import { jsonActionError, requireRouteId } from '@/lib/api-helpers';
import type { RouteIdParams } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: RouteIdParams,
) {
  try {
    const statementId = await requireRouteId(params, 'tiliote');
    const body = await request.json();
    const result = await createBankStatementDocumentsAction({
      statementId,
      entryIds: body?.entryIds,
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonActionError(error, 'Tositteiden luonti epäonnistui');
  }
}
