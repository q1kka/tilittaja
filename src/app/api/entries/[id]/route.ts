import { NextRequest, NextResponse } from 'next/server';
import {
  updateEntryAccountAction,
  updateEntryDescriptionAction,
} from '@/actions/app-actions';
import { jsonActionError, jsonError, requireRouteId } from '@/lib/api-helpers';
import type { RouteIdParams } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: RouteIdParams,
) {
  try {
    const entryId = await requireRouteId(params, 'vientirivin tunniste');

    const body = await request.json().catch(() => null);
    const description = body?.description;
    const accountId = body?.accountId;
    const hasDescription = typeof description === 'string';
    const hasAccountId = Number.isInteger(accountId) && accountId > 0;

    if (!hasDescription && !hasAccountId) {
      return jsonError('Anna joko kuvaus tai tili', 400);
    }

    let nextDescription: string | undefined;
    let nextAccountId: number | undefined;
    let accountNumber: string | undefined;
    let accountName: string | undefined;

    if (hasDescription) {
      const payload = await updateEntryDescriptionAction(entryId, {
        description,
      });
      nextDescription = payload.description;
    }

    if (hasAccountId) {
      const payload = await updateEntryAccountAction(entryId, { accountId });
      nextAccountId = payload.accountId;
      accountNumber = payload.accountNumber;
      accountName = payload.accountName;
    }

    return NextResponse.json({
      id: entryId,
      description: nextDescription,
      accountId: nextAccountId,
      accountNumber,
      accountName,
    });
  } catch (error) {
    return jsonActionError(error, 'Vientirivin päivitys epäonnistui');
  }
}
