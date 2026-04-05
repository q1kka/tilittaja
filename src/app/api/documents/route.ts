import { NextRequest, NextResponse } from 'next/server';
import { createDocumentAction } from '@/actions/app-actions';
import { jsonActionError } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const document = await createDocumentAction(body);
    return NextResponse.json(document);
  } catch (error) {
    return jsonActionError(error, 'Tositteen luonti epäonnistui');
  }
}
