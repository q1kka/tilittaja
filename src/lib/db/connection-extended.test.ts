import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import Database from 'better-sqlite3';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('./migrations', () => ({
  ensureAppTables: vi.fn(),
}));

import {
  closeDbConnection,
  getDb,
  hasAnyDataSource,
  initDb,
  resolveDbPath,
  resolveRequestDbPath,
  runWithRequestDb,
} from './connection';

const DATA_DIR = path.resolve(process.cwd(), '..', 'data');
const originalReaddirSync = fs.readdirSync.bind(fs) as typeof fs.readdirSync;

function mockDataDir(sources: Record<string, string[]> | null) {
  return vi.spyOn(fs, 'readdirSync').mockImplementation(
    ((...args: Parameters<typeof fs.readdirSync>) => {
      const [targetPath, options] = args;
      const resolvedPath = path.resolve(String(targetPath));

      if (resolvedPath === DATA_DIR) {
        if (!sources) {
          throw new Error('mock missing data dir');
        }

        if (
          typeof options === 'object' &&
          options !== null &&
          'withFileTypes' in options &&
          options.withFileTypes
        ) {
          return Object.keys(sources).map((name) => ({
            name,
            isDirectory: () => true,
          })) as ReturnType<typeof fs.readdirSync>;
        }

        return Object.keys(sources) as ReturnType<typeof fs.readdirSync>;
      }

      if (sources) {
        const matchingSource = Object.entries(sources).find(
          ([slug]) => resolvedPath === path.join(DATA_DIR, slug),
        );

        if (matchingSource) {
          return matchingSource[1] as ReturnType<typeof fs.readdirSync>;
        }
      }

      return originalReaddirSync(...args);
    }) as typeof fs.readdirSync,
  );
}

describe('connection - extended coverage', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tilittaja-conn-ext-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('resolveDbPath', () => {
    it('returns null for directory with no sqlite files', () => {
      expect(resolveDbPath('__nonexistent_slug__')).toBeNull();
    });
  });

  describe('hasAnyDataSource', () => {
    it('returns false when data dir does not exist', () => {
      expect(typeof hasAnyDataSource()).toBe('boolean');
    });
  });

  describe('resolveRequestDbPath', () => {
    it('falls back to DATABASE_PATH when cookie fails and no default source', async () => {
      const { cookies } = await import('next/headers');
      (cookies as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('no cookie'),
      );
      mockDataDir(null);

      const dbPath = path.join(tmpDir, 'env-fallback.sqlite');
      new Database(dbPath).close();

      const orig = process.env.DATABASE_PATH;
      process.env.DATABASE_PATH = dbPath;

      try {
        const resolved = await resolveRequestDbPath();
        expect(resolved).toBe(dbPath);
      } finally {
        if (orig !== undefined) {
          process.env.DATABASE_PATH = orig;
        } else {
          delete process.env.DATABASE_PATH;
        }
      }
    });

    it('throws when no db path can be resolved at all', async () => {
      const { cookies } = await import('next/headers');
      (cookies as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('no cookie'),
      );
      mockDataDir(null);

      const orig = process.env.DATABASE_PATH;
      delete process.env.DATABASE_PATH;

      try {
        await expect(resolveRequestDbPath()).rejects.toThrow(
          'Tietokantaa ei voitu avata',
        );
      } finally {
        if (orig !== undefined) process.env.DATABASE_PATH = orig;
      }
    });

    it('resolves from cookie value when available', async () => {
      const { cookies } = await import('next/headers');
      mockDataDir({
        'test-source': ['kirjanpito.sqlite'],
      });
      (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'test-source' }),
      });

      await expect(resolveRequestDbPath()).resolves.toBe(
        path.join(DATA_DIR, 'test-source', 'kirjanpito.sqlite'),
      );
    });
  });

  describe('closeDbConnection', () => {
    it('resets fallbackDbPath when closing the fallback connection', () => {
      const dbPath = path.join(tmpDir, 'fallback-close.sqlite');
      new Database(dbPath).close();

      runWithRequestDb(dbPath, () => {
        getDb();
      });

      closeDbConnection(dbPath);
      closeDbConnection(dbPath);
    });

    it('is idempotent for unknown paths', () => {
      expect(() => closeDbConnection('/nonexistent/path.sqlite')).not.toThrow();
    });
  });

  describe('getDb', () => {
    it('resolves relative DATABASE_PATH against cwd', () => {
      const dbPath = path.join(tmpDir, 'relative.sqlite');
      new Database(dbPath).close();

      runWithRequestDb(dbPath, () => {
        const db = getDb();
        expect(db).toBeDefined();
      });

      closeDbConnection(dbPath);
    });

    it('caches connection and runs migrations only once', () => {
      const dbPath = path.join(tmpDir, 'cache.sqlite');
      new Database(dbPath).close();

      runWithRequestDb(dbPath, () => {
        const db1 = getDb();
        const db2 = getDb();
        expect(db1).toBe(db2);
      });

      closeDbConnection(dbPath);
    });
  });

  describe('initDb', () => {
    it('handles full initialization failure gracefully', async () => {
      const { cookies } = await import('next/headers');
      (cookies as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('no request context'),
      );

      const orig = process.env.DATABASE_PATH;
      delete process.env.DATABASE_PATH;

      try {
        await expect(initDb()).resolves.not.toThrow();
      } finally {
        if (orig !== undefined) process.env.DATABASE_PATH = orig;
      }
    });
  });
});
