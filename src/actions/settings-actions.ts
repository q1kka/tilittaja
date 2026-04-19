'use server';

import { revalidatePath } from 'next/cache';
import {
  getPeriod,
  setPeriodLocked,
  updateCompanyInfo,
  updateSettingProperties,
} from '@/lib/db';
import { runDbAction } from '@/actions/_helpers';
import {
  companyInfoSchema,
  periodLockSchema,
  recurringRentGenerateSchema,
  tilinpaatosMetadataSchema,
} from '@/lib/validation';
import { requireResource } from '@/lib/api-helpers';
import {
  getTilinpaatosMetadataDefaults,
  metadataToProperties,
  normalizeDischargeTarget,
  type TilinpaatosMetadata,
} from '@/lib/tilinpaatos';
import { requireUnlockedExistingPeriod } from '@/lib/period-locks';
import { createRecurringRentDocuments } from '@/lib/recurring-rent';

function revalidateApp(): void {
  revalidatePath('/', 'layout');
  revalidatePath('/documents');
  revalidatePath('/accounts');
  revalidatePath('/bank-statements');
  revalidatePath('/settings');
  revalidatePath('/settings/recurring-rent');
  revalidatePath('/vat');
  revalidatePath('/reports/tilinpaatos');
}

function normalizeMetadata(
  input: Partial<TilinpaatosMetadata>,
  defaults: TilinpaatosMetadata,
): TilinpaatosMetadata {
  return {
    place: (input.place ?? defaults.place).trim(),
    signatureDate: (input.signatureDate ?? defaults.signatureDate).trim(),
    preparedBy: (input.preparedBy ?? defaults.preparedBy).trim(),
    signerName: (input.signerName ?? defaults.signerName).trim(),
    signerTitle: (input.signerTitle ?? defaults.signerTitle).trim(),
    microDeclaration: (
      input.microDeclaration ?? defaults.microDeclaration
    ).trim(),
    boardProposal: (input.boardProposal ?? defaults.boardProposal).trim(),
    parentCompany: (input.parentCompany ?? defaults.parentCompany).trim(),
    shareInfo: (input.shareInfo ?? defaults.shareInfo).trim(),
    personnelCount: (input.personnelCount ?? defaults.personnelCount).trim(),
    archiveNote: (input.archiveNote ?? defaults.archiveNote).trim(),
    meetingDate: (input.meetingDate ?? defaults.meetingDate).trim(),
    attendees: (input.attendees ?? defaults.attendees).trim(),
    dischargeTarget: normalizeDischargeTarget(
      input.dischargeTarget ?? defaults.dischargeTarget,
    ),
  };
}

export async function updateCompanyInfoAction(input: unknown) {
  const parsed = companyInfoSchema.parse(input);

  return runDbAction(() => {
    updateCompanyInfo(parsed.name, parsed.businessId);
    revalidateApp();
    return { ok: true };
  }, 'Yrityksen tietojen tallennus epäonnistui.');
}

export async function updateTilinpaatosMetadataAction(
  input: Partial<TilinpaatosMetadata>,
) {
  const parsed = tilinpaatosMetadataSchema.parse(input);

  return runDbAction(() => {
    const defaults = getTilinpaatosMetadataDefaults();
    const metadata = normalizeMetadata(parsed, defaults);
    updateSettingProperties(metadataToProperties(metadata));
    revalidateApp();
    return { ok: true, metadata };
  }, 'Tilinpäätösasetusten tallennus epäonnistui.');
}

export async function setPeriodLockAction(periodId: number, locked: boolean) {
  const parsed = periodLockSchema.parse({ periodId, locked });

  return runDbAction(() => {
    requireResource(getPeriod(parsed.periodId), 'Tilikautta ei löytynyt');
    setPeriodLocked(parsed.periodId, parsed.locked);
    revalidateApp();
    return { ok: true, locked: parsed.locked };
  }, 'Tilikauden lukituksen tallennus epäonnistui.');
}

export async function generateRecurringRentDocumentsAction(input: unknown) {
  const parsed = recurringRentGenerateSchema.parse(input);

  return runDbAction(() => {
    requireUnlockedExistingPeriod(parsed.periodId);
    const result = createRecurringRentDocuments(parsed.periodId);
    revalidateApp();
    return result;
  }, 'Kuukausivuokrien tositteiden luonti epäonnistui.');
}
