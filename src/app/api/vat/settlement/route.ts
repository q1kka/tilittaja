import { NextRequest, NextResponse } from 'next/server';
import { createVatSettlementAction } from '@/actions/app-actions';
import { jsonActionError } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const document = await createVatSettlementAction(body);
    return NextResponse.json(document);
  } catch (error) {
    return jsonActionError(error, 'ALV-ilmoituksen muodostus epäonnistui.');
  }
}
