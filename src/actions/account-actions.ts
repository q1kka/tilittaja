'use server';

import { revalidatePath } from 'next/cache';
import {
  cloneAccount,
  createAccount,
  deleteAccount,
  updateAccount,
} from '@/lib/db';
import { runDbAction } from '@/actions/_helpers';
import {
  accountCloneSchema,
  accountFormSchema,
} from '@/lib/validation';
import { ApiRouteError } from '@/lib/api-helpers';

function revalidateApp(): void {
  revalidatePath('/', 'layout');
  revalidatePath('/documents');
  revalidatePath('/accounts');
  revalidatePath('/bank-statements');
  revalidatePath('/settings');
  revalidatePath('/vat');
  revalidatePath('/reports/tilinpaatos');
}

export async function createAccountAction(input: unknown) {
  const parsed = accountFormSchema.parse(input);

  return runDbAction(() => {
    try {
      const account = createAccount({
        ...parsed,
        number: parsed.number.trim(),
        name: parsed.name.trim(),
        vat_code: parsed.vat_code ?? 0,
        vat_percentage: parsed.vat_percentage ?? 0,
      });
      revalidateApp();
      return account;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('on jo käytössä')) {
        throw new ApiRouteError(message);
      }
      throw error;
    }
  }, 'Tilin luonti epäonnistui.');
}

export async function updateAccountAction(accountId: number, input: unknown) {
  const parsed = accountFormSchema.partial().parse(input);

  return runDbAction(() => {
    try {
      const updated = updateAccount(accountId, {
        number: parsed.number?.trim(),
        name: parsed.name?.trim(),
        type: parsed.type,
        vat_code: parsed.vat_code,
        vat_percentage: parsed.vat_percentage,
      });
      revalidateApp();
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('ei löytynyt')) {
        throw new ApiRouteError(message, 404);
      }
      if (message.includes('on jo käytössä')) {
        throw new ApiRouteError(message);
      }
      throw error;
    }
  }, 'Tilin päivitys epäonnistui.');
}

export async function cloneAccountAction(accountId: number, input: unknown) {
  const parsed = accountCloneSchema.parse(input);

  return runDbAction(() => {
    try {
      const cloned = cloneAccount(
        accountId,
        parsed.number.trim(),
        parsed.name?.trim() || undefined,
      );
      revalidateApp();
      return cloned;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('ei löytynyt')) {
        throw new ApiRouteError(message, 404);
      }
      if (message.includes('on jo käytössä')) {
        throw new ApiRouteError(message);
      }
      throw error;
    }
  }, 'Tilin kloonaus epäonnistui.');
}

export async function deleteAccountAction(accountId: number) {
  return runDbAction(() => {
    try {
      deleteAccount(accountId);
      revalidateApp();
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('ei löytynyt')) {
        throw new ApiRouteError(message, 404);
      }
      if (message.includes('ei voi poistaa')) {
        throw new ApiRouteError(message);
      }
      throw error;
    }
  }, 'Tilin poisto epäonnistui.');
}
