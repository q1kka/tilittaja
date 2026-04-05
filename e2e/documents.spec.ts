import { test, expect, type Page } from '@playwright/test';

async function selectAccount(page: Page, rowIndex: number, searchTerm: string) {
  await page
    .locator('table tbody tr')
    .nth(rowIndex)
    .locator('button')
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Valitse tili' });
  await expect(dialog).toBeVisible();
  await dialog
    .getByPlaceholder('Hae tiliä numerolla, nimellä tai tyypillä...')
    .fill(searchTerm);
  await dialog
    .locator('button')
    .filter({ hasText: searchTerm })
    .first()
    .click();
  await dialog.getByRole('button', { name: 'Valitse tili' }).click();
}

test.describe('Documents page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/documents');
  });

  test('shows page chrome and documents table', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Tositteet', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Uusi tosite/i }),
    ).toBeVisible();

    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    await expect(
      table.getByRole('columnheader', { name: 'Nro' }),
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', { name: 'Päivä' }),
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', { name: 'Kuvaus' }),
    ).toBeVisible();
  });

  test('search and month filter controls are present', async ({ page }) => {
    await expect(
      page.getByPlaceholder(
        'Hae tositteita kuvauksella, tilillä, päivällä tai summalla...',
      ),
    ).toBeVisible();
    const monthFilter = page.locator('select:has(option[value="all"])');
    await expect(monthFilter).toBeVisible();
    await expect(monthFilter).toHaveValue('all');
  });

  test('creates and deletes a balanced document', async ({ page }, testInfo) => {
    const documentLabel = `Playwright kassa ${testInfo.retry}-${Date.now()}`;

    await page.getByRole('link', { name: /Uusi tosite/i }).click();
    await expect(
      page.getByRole('heading', { name: /Uusi tosite/i }),
    ).toBeVisible();

    await selectAccount(page, 0, '1910');
    await selectAccount(page, 1, '3000');

    await page
      .getByRole('textbox', { name: 'Kuvaus' })
      .nth(0)
      .fill(documentLabel);
    await page.getByRole('textbox', { name: 'Kuvaus' }).nth(1).fill('Myynti');
    await page.locator('input[placeholder="0,00"]').nth(0).fill('100,00');
    await page.locator('input[placeholder="0,00"]').nth(3).fill('100,00');

    await expect(page.getByText('Tosite on tasapainossa')).toBeVisible();
    await page.getByRole('button', { name: 'Tallenna' }).click();

    await expect(page).toHaveURL(/\/documents\?/);
    await expect(page.locator('aside').getByText(documentLabel)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Poista tosite' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Poista tosite' }).click();

    await expect(page.locator('aside').getByText(documentLabel)).toHaveCount(0);
  });
});
