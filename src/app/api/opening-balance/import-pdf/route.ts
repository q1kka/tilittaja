import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withDb, jsonError } from '@/lib/api-helpers';
import { applyImportedOpeningBalance } from '@/lib/opening-balance-import';

export const runtime = 'nodejs';

const uploadSchema = z.object({
  periodId: z.coerce
    .number({ error: 'Valitse tilikausi' })
    .int({ error: 'Valitse tilikausi' })
    .positive({ error: 'Valitse tilikausi' }),
});

function isPdfFile(file: File): boolean {
  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );
}

export const POST = withDb(async (request: NextRequest) => {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return jsonError('Lähetä PDF:t multipart-lomakkeena', 400);
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError('Virheellinen lomakedata', 400);
  }

  const files = formData
    .getAll('files')
    .filter((file): file is File => file instanceof File);

  if (files.length === 0) {
    return jsonError('Lähetä vähintään yksi PDF-tiedosto kentässä `files`', 400);
  }

  if (files.length > 10) {
    return jsonError('Voit lähettää korkeintaan 10 PDF-tiedostoa', 400);
  }

  if (files.some((file) => !isPdfFile(file))) {
    return jsonError('Vain PDF-tiedostot ovat sallittuja', 400);
  }

  const parsedForm = uploadSchema.parse({
    periodId: formData.get('periodId'),
  });

  const result = await applyImportedOpeningBalance({
    periodId: parsedForm.periodId,
    files: await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    ),
  });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}, 'Tilikauden avauksen PDF-tuonti epäonnistui');
