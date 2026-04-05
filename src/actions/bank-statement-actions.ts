'use server';

import fs from 'fs';
import { revalidatePath } from 'next/cache';
import {
  createBankStatement,
  createBankStatementEntry,
  createDocumentsFromBankStatementEntries,
  deleteBankStatement,
  getAccount,
  getBankStatement,
  getBankStatementEntries,
  getDocument,
  getSettings,
  mergeBankStatements,
  requireCurrentDataSource,
  updateBankStatementEntry,
} from '@/lib/db';
import { runDbAction } from '@/actions/_helpers';
import {
  bankStatementCreateDocumentsSchema,
  bankStatementEntryLinkSchema,
  bankStatementManualCreateSchema,
  bankStatementMergeSchema,
} from '@/lib/validation';
import { ApiRouteError, requireResource } from '@/lib/api-helpers';
import {
  requireUnlockedBankStatementEntryPeriod,
  requireUnlockedBankStatementPeriod,
  requireUnlockedDocumentPeriodById,
  requireUnlockedExistingPeriod,
} from '@/lib/period-locks';
import { resolveBankStatementPdfAbsolutePath } from '@/lib/receipt-pdfs';

function revalidateApp(): void {
  revalidatePath('/', 'layout');
  revalidatePath('/documents');
  revalidatePath('/accounts');
  revalidatePath('/bank-statements');
  revalidatePath('/settings');
  revalidatePath('/vat');
  revalidatePath('/reports/tilinpaatos');
}

export async function updateBankStatementEntryDocumentAction(
  statementId: number,
  input: unknown,
) {
  void statementId;
  const parsed = bankStatementEntryLinkSchema.parse(input);

  return runDbAction(() => {
    requireUnlockedBankStatementEntryPeriod(parsed.entryId);

    if (parsed.documentId !== null) {
      requireResource(getDocument(parsed.documentId), 'Tositetta ei löytynyt');
      requireUnlockedDocumentPeriodById(parsed.documentId);
    }

    updateBankStatementEntry(parsed.entryId, {
      document_id: parsed.documentId,
    });

    revalidateApp();
    return { ok: true };
  }, 'Päivitys epäonnistui.');
}

export async function createBankStatementDocumentsAction(input: unknown) {
  const parsed = bankStatementCreateDocumentsSchema.parse(input);

  return runDbAction(() => {
    const statement = requireResource(
      getBankStatement(parsed.statementId),
      'Tiliotetta ei löydy',
    );

    const settings = getSettings();
    requireUnlockedExistingPeriod(settings.current_period_id);

    const idsToProcess = parsed.entryIds.length
      ? parsed.entryIds
      : getBankStatementEntries(parsed.statementId)
          .filter((entry) => !entry.document_id && entry.counterpart_account_id)
          .map((entry) => entry.id);

    if (idsToProcess.length === 0) {
      throw new ApiRouteError('Ei käsiteltäviä rivejä');
    }

    const result = createDocumentsFromBankStatementEntries(
      idsToProcess,
      statement.account_id,
      settings.current_period_id,
    );

    revalidateApp();
    return result;
  }, 'Tositteiden luonti epäonnistui.');
}

export async function mergeBankStatementsAction(input: unknown) {
  const parsed = bankStatementMergeSchema.parse(input);

  return runDbAction(async () => {
    requireUnlockedBankStatementPeriod(parsed.masterStatementId);
    for (const statementId of parsed.mergedStatementIds) {
      requireUnlockedBankStatementPeriod(statementId);
    }

    const { masterStatement, mergedStatements } = mergeBankStatements(parsed);
    const source = await requireCurrentDataSource();
    const warnings: string[] = [];
    const sourcePaths = new Set<string>();

    for (const statement of mergedStatements) {
      if (!statement.source_file) continue;
      const resolvedPath = resolveBankStatementPdfAbsolutePath(
        source,
        statement.source_file,
      );
      if (!resolvedPath) continue;
      sourcePaths.add(resolvedPath);
    }

    for (const absolutePath of sourcePaths) {
      try {
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch {
        warnings.push('PDF-tiedoston poisto epäonnistui');
      }
    }

    revalidateApp();
    return {
      ok: true,
      masterStatementId: masterStatement.id,
      mergedCount: mergedStatements.length,
      warnings,
    };
  }, 'Tiliotteiden yhdistäminen epäonnistui.');
}

export async function deleteBankStatementAction(statementId: number) {
  return runDbAction(() => {
    requireUnlockedBankStatementPeriod(statementId);
    const deleted = deleteBankStatement(statementId);

    if (!deleted) {
      throw new ApiRouteError('Tiliotetta ei löydy', 404);
    }

    revalidateApp();
    return { ok: true };
  }, 'Tiliotteen poisto epäonnistui.');
}

export async function createBankStatementManualAction(input: unknown) {
  const parsed = bankStatementManualCreateSchema.parse(input);

  return runDbAction(() => {
    const account = requireResource(
      getAccount(parsed.accountId),
      'Pankkitiliä ei löydy',
    );

    const statement = createBankStatement({
      account_id: account.id,
      iban: parsed.iban,
      period_start: parsed.periodStart,
      period_end: parsed.periodEnd,
      opening_balance: parsed.openingBalance,
      closing_balance: parsed.closingBalance,
      source_file: '',
    });

    for (let i = 0; i < parsed.entries.length; i++) {
      const entry = parsed.entries[i];
      createBankStatementEntry({
        bank_statement_id: statement.id,
        entry_date: entry.entryDate,
        value_date: entry.entryDate,
        archive_id: '',
        counterparty: entry.counterparty,
        counterparty_iban: null,
        reference: entry.reference,
        message: entry.message,
        payment_type: '',
        transaction_number: i + 1,
        amount: entry.amount,
        counterpart_account_id: null,
      });
    }

    revalidateApp();
    return { id: statement.id };
  }, 'Tiliotteen luonti epäonnistui.');
}
