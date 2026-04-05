import { NextRequest, NextResponse } from 'next/server';
import {
  deleteAccountAction,
  updateAccountAction,
} from '@/actions/app-actions';
import { jsonActionError, requireRouteId } from '@/lib/api-helpers';
import type { RouteIdParams } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: RouteIdParams,
) {
  try {
    const accountId = await requireRouteId(params, 'tilin tunniste');
    const body = await request.json();
    const updated = await updateAccountAction(accountId, body);
    return NextResponse.json(updated);
  } catch (error) {
    return jsonActionError(error, 'Tilin päivitys epäonnistui');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteIdParams,
) {
  try {
    const accountId = await requireRouteId(params, 'tilin tunniste');
    const result = await deleteAccountAction(accountId);
    return NextResponse.json(result);
  } catch (error) {
    return jsonActionError(error, 'Tilin poisto epäonnistui');
  }
}
