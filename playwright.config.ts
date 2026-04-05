import path from 'path';
import { defineConfig, devices } from '@playwright/test';

process.env.PLAYWRIGHT_TEST_BASE_URL ??= 'http://localhost:3000';
process.env.PLAYWRIGHT_E2E_SOURCE_SLUG ??= `__playwright_e2e_${process.pid}`;

const storageStatePath = path.resolve(
  process.cwd(),
  'playwright/.cache/e2e-storage-state.json',
);

/**
 * E2E uses `yarn dev:e2e` (default host → reachable at localhost:3000).
 *
 * If you already run `yarn dev` with `--hostname 192.168.1.2`, Next may not
 * answer on localhost, so Playwright thinks the port is free, starts another
 * dev process, and you get “Another next dev server is already running”.
 * Stop `yarn dev` before E2E, or run only `yarn dev:e2e` for tests.
 *
 * Override base URL: `PLAYWRIGHT_TEST_BASE_URL=http://192.168.1.2:3000 yarn test:e2e`
 * (and start a server that listens there; webServer is skipped only if that URL is already up).
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './playwright.global-setup.ts',
  globalTeardown: './playwright.global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://localhost:3000',
    storageState: storageStatePath,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'yarn seed:e2e && yarn dev:e2e',
    url: process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
