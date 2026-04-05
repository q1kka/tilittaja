import fs from 'fs';
import path from 'path';

const STORAGE_STATE_PATH = path.resolve(
  process.cwd(),
  'playwright/.cache/e2e-storage-state.json',
);

function getSourceSlug(): string {
  return process.env.PLAYWRIGHT_E2E_SOURCE_SLUG ?? '__playwright_e2e__';
}

export default async function globalTeardown(): Promise<void> {
  const sourceDir = path.resolve(process.cwd(), '..', 'data', getSourceSlug());

  fs.rmSync(sourceDir, { recursive: true, force: true });
  fs.rmSync(STORAGE_STATE_PATH, { force: true });
}
