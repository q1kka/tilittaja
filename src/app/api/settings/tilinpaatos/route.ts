import { NextRequest, NextResponse } from 'next/server';
import { updateTilinpaatosMetadataAction } from '@/actions/app-actions';
import { getTilinpaatosMetadataDefaults } from '@/lib/tilinpaatos';
import { jsonActionError, withDb } from '@/lib/api-helpers';

export const GET = withDb(async () => {
  const defaults = getTilinpaatosMetadataDefaults();
  return NextResponse.json({ defaults });
}, 'Tilinpäätösasetusten haku epäonnistui');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await updateTilinpaatosMetadataAction(body);
    return NextResponse.json(result);
  } catch (error) {
    return jsonActionError(error, 'Tilinpäätösasetusten tallennus epäonnistui');
  }
}
