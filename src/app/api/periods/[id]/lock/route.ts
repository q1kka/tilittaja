import { NextRequest } from 'next/server';
import { setPeriodLockAction } from '@/actions/app-actions';
import { jsonActionRoute, requireRouteId } from '@/lib/api-helpers';
import type { RouteIdParams } from '@/lib/types';

export const POST = jsonActionRoute(async (
  _request: NextRequest,
  { params }: RouteIdParams,
) => {
  const periodId = await requireRouteId(params);
  return setPeriodLockAction(periodId, true);
}, 'Tilikauden lukitus epäonnistui');

export const DELETE = jsonActionRoute(async (
  _request: NextRequest,
  { params }: RouteIdParams,
) => {
  const periodId = await requireRouteId(params);
  return setPeriodLockAction(periodId, false);
}, 'Tilikauden lukituksen avaus epäonnistui');
