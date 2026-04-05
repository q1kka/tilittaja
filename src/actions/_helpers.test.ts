import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';

const { resolveRequestDbPath, runWithRequestDb } = vi.hoisted(() => ({
  resolveRequestDbPath: vi.fn(),
  runWithRequestDb: vi.fn(),
}));

vi.mock('@/lib/db/connection', () => ({
  resolveRequestDbPath,
  runWithRequestDb,
}));

import { ApiRouteError } from '@/lib/api-helpers';
import { runDbAction } from './_helpers';

describe('runDbAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveRequestDbPath.mockResolvedValue('/tmp/test.sqlite');
    runWithRequestDb.mockImplementation(
      async (_dbPath: string, action: () => unknown) => action(),
    );
  });

  it('runs the action inside the resolved request database', async () => {
    await expect(runDbAction(() => 'ok', 'fallback')).resolves.toBe('ok');
    expect(resolveRequestDbPath).toHaveBeenCalled();
    expect(runWithRequestDb).toHaveBeenCalledWith(
      '/tmp/test.sqlite',
      expect.any(Function),
    );
  });

  it('formats zod validation errors', async () => {
    const schema = z.object({
      name: z.string().min(1, 'Nimi puuttuu'),
    });

    await expect(
      runDbAction(() => schema.parse({ name: '' }), 'fallback'),
    ).rejects.toThrow('Nimi puuttuu');
  });

  it('returns ApiRouteError messages directly', async () => {
    await expect(
      runDbAction(() => {
        throw new ApiRouteError('Lukittu', 423);
      }, 'fallback'),
    ).rejects.toThrow('Lukittu');
  });

  it('wraps generic Error instances with the fallback message', async () => {
    await expect(
      runDbAction(() => {
        throw new Error('Boom');
      }, 'fallback'),
    ).rejects.toThrow('fallback');
  });

  it('uses the fallback message for unknown error values', async () => {
    await expect(
      runDbAction(() => {
        throw 'mystery';
      }, 'Tuntematon virhe'),
    ).rejects.toThrow('Tuntematon virhe');
  });
});
