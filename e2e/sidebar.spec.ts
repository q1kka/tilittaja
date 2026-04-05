import { test, expect } from '@playwright/test';

test.describe('Sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/documents/);
  });

  test('main nav links reach expected routes', async ({ page }) => {
    const aside = page.locator('aside');

    await aside.getByRole('link', { name: 'Tiliotteet' }).click();
    await expect(page).toHaveURL(/\/bank-statements/);

    await aside.getByRole('link', { name: 'Tositteet' }).click();
    await expect(page).toHaveURL(/\/documents/);
    await expect(
      page.getByRole('heading', { name: 'Tositteet', exact: true }),
    ).toBeVisible();

    await aside.getByRole('link', { name: 'Tase' }).click();
    await expect(page).toHaveURL(/\/reports\/balance-sheet/);
    await expect(page.getByRole('heading', { name: 'Tase' })).toBeVisible();
  });

  test('brand link returns to documents', async ({ page }) => {
    await page.goto('/documents');
    await page
      .locator('aside')
      .getByRole('link', { name: 'Tilittaja' })
      .click();
    await expect(page).toHaveURL(/\/documents/);
    await expect(
      page.getByRole('heading', { name: 'Tositteet', exact: true }),
    ).toBeVisible();
  });

  test('settings and tilikartta links load', async ({ page }) => {
    const aside = page.locator('aside');

    await aside.getByRole('link', { name: 'Asetukset' }).click();
    await expect(page).toHaveURL(/\/settings/);

    await aside.getByRole('link', { name: 'Tilikartta' }).click();
    await expect(page).toHaveURL(/\/accounts/);
  });
});
