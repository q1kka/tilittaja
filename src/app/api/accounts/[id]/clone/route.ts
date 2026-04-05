import { NextRequest, NextResponse } from 'next/server';
import { cloneAccountAction } from '@/actions/app-actions';
import { jsonActionError, requireRouteId } from '@/lib/api-helpers';
import type { RouteIdParams } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: RouteIdParams,
) {
  try {
    const sourceId = await requireRouteId(params, 'tilin tunniste');
    const body = await request.json();
    const cloned = await cloneAccountAction(sourceId, body);
    return NextResponse.json(cloned, { status: 201 });
  } catch (error) {
    return jsonActionError(error, 'Tilin kloonaus epäonnistui');
  }
}
