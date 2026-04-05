import { NextResponse } from 'next/server';
import { setPeriodLockAction } from '@/actions/app-actions';
import { jsonActionError, requireRouteId } from '@/lib/api-helpers';
import type { RouteIdParams } from '@/lib/types';

export async function POST(_req: Request, { params }: RouteIdParams) {
  try {
    const periodId = await requireRouteId(params);
    const result = await setPeriodLockAction(periodId, true);
    return NextResponse.json(result);
  } catch (error) {
    return jsonActionError(error, 'Tilikauden lukitus epäonnistui');
  }
}

export async function DELETE(_req: Request, { params }: RouteIdParams) {
  try {
    const periodId = await requireRouteId(params);
    const result = await setPeriodLockAction(periodId, false);
    return NextResponse.json(result);
  } catch (error) {
    return jsonActionError(error, 'Tilikauden lukituksen avaus epäonnistui');
  }
}
