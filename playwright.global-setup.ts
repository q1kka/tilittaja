import fs from 'fs';
import path from 'path';

const STORAGE_STATE_PATH = path.resolve(
  process.cwd(),
  'playwright/.cache/e2e-storage-state.json',
);

function getSourceSlug(): string {
  return process.env.PLAYWRIGHT_E2E_SOURCE_SLUG ?? '__playwright_e2e__';
}

function getCookieDomains(hostname: string): string[] {
  const domains = new Set([hostname]);

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    domains.add('localhost');
    domains.add('127.0.0.1');
  }

  return [...domains];
}

export default async function globalSetup(): Promise<void> {
  const slug = getSourceSlug();
  const baseUrl = new URL(
    process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://localhost:3000',
  );

  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  fs.writeFileSync(
    STORAGE_STATE_PATH,
    JSON.stringify(
      {
        cookies: getCookieDomains(baseUrl.hostname).map((domain) => ({
          name: 'datasource',
          value: slug,
          domain,
          path: '/',
          httpOnly: true,
          sameSite: 'Lax',
          secure: baseUrl.protocol === 'https:',
          expires: Math.floor(Date.now() / 1000) + 60 * 60,
        })),
      },
      null,
      2,
    ),
  );
}
