import { NextRequest, NextResponse } from 'next/server';
import { mergeBankStatementsAction } from '@/actions/app-actions';
import { jsonActionError } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const result = await mergeBankStatementsAction(body);
    return NextResponse.json(result);
  } catch (error) {
    return jsonActionError(error, 'Tiliotteiden yhdistäminen epäonnistui');
  }
}
