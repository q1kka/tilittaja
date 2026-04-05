import { test, expect } from '@playwright/test';

test.describe('Navigation smoke', () => {
  test('home redirects to documents', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/tilittaja/i);
    await expect(page).toHaveURL(/\/documents/);
    await expect(
      page.getByRole('heading', { name: 'Tositteet', exact: true }),
    ).toBeVisible();
  });

  test('documents page shows heading and new-document action', async ({
    page,
  }) => {
    await page.goto('/documents');
    await expect(
      page.getByRole('heading', { name: 'Tositteet', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Uusi tosite/i }),
    ).toBeVisible();
  });

  test('balance sheet report loads', async ({ page }) => {
    await page.goto('/reports/balance-sheet');
    await expect(page.getByRole('heading', { name: 'Tase' })).toBeVisible();
    await expect(page.getByText('Raportit').first()).toBeVisible();
  });

  test('direct navigation between main routes', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/documents/);
    await expect(
      page.getByRole('heading', { name: 'Tositteet', exact: true }),
    ).toBeVisible();

    await page.goto('/documents');
    await expect(
      page.getByRole('heading', { name: 'Tositteet', exact: true }),
    ).toBeVisible();

    await page.goto('/reports/balance-sheet');
    await expect(page.getByRole('heading', { name: 'Tase' })).toBeVisible();

    await page.goto('/settings');
    await expect(
      page.getByRole('heading', { name: 'Yrityksen asetukset' }),
    ).toBeVisible();
  });
});
