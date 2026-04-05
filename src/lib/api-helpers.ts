import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveRequestDbPath, runWithRequestDb } from '@/lib/db/connection';

export class ApiRouteError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ApiRouteError';
    this.status = status;
  }
}

export function jsonError(message: string, status = 500): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function jsonActionError(
  error: unknown,
  fallbackMessage: string,
  businessStatus = 400,
): NextResponse {
  if (error instanceof z.ZodError) {
    const message = error.issues[0]?.message || 'Virheellinen syöte';
    return jsonError(message, 400);
  }

  if (error instanceof Error) {
    const status =
      typeof (error as Error & { status?: number }).status === 'number'
        ? (error as Error & { status?: number }).status
        : error.message === fallbackMessage
          ? 500
          : businessStatus;
    return jsonError(
      error.message || fallbackMessage,
      status,
    );
  }

  return jsonError(fallbackMessage);
}

export async function requireRouteId(
  params: Promise<{ id: string }>,
  label = 'tunniste',
): Promise<number> {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    throw new ApiRouteError(`Virheellinen ${label}`, 400);
  }
  return numId;
}

export function requireResource<T>(
  resource: T | undefined | null,
  message: string,
): T {
  if (resource == null) {
    throw new ApiRouteError(message, 404);
  }
  return resource;
}

/**
 * Wraps an API route handler with request-scoped DB initialization and
 * centralized error handling. Resolves the datasource from the request
 * cookie and makes it available to `getDb()` via AsyncLocalStorage.
 *
 * Catches `ApiRouteError` (business-rule violations) and `ZodError`
 * (input validation failures) and maps them to structured JSON errors.
 *
 * **When to use API routes vs server actions:**
 * - API routes: binary responses (PDF/ZIP), endpoints consumed by
 *   non-React clients, or GET endpoints that return JSON.
 * - Server actions (`src/actions/`): mutations triggered from React
 *   client components. They use `runDbAction` for the same DB scoping
 *   and call `revalidatePath` to refresh server-rendered data.
 */
export function withDb<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<NextResponse>,
  errorMessage = 'Odottamaton virhe',
): (...args: TArgs) => Promise<NextResponse> {
  const wrapped = async (...args: TArgs) => {
    try {
      const dbPath = await resolveRequestDbPath();
      return await runWithRequestDb(dbPath, () => handler(...args));
    } catch (error) {
      if (error instanceof ApiRouteError) {
        return jsonError(error.message, error.status);
      }
      if (error instanceof z.ZodError) {
        const message = error.issues[0]?.message || 'Virheellinen syöte';
        return jsonError(message, 400);
      }
      console.error(errorMessage, error);
      return jsonError(errorMessage);
    }
  };
  return wrapped;
}
