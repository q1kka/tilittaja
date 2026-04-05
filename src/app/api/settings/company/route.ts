import { NextResponse } from 'next/server';
import { updateCompanyInfoAction } from '@/actions/app-actions';
import { jsonActionError } from '@/lib/api-helpers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await updateCompanyInfoAction(body);
    return NextResponse.json(result);
  } catch (error) {
    return jsonActionError(error, 'Yrityksen tietojen tallennus epäonnistui');
  }
}
