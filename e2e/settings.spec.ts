import { test, expect } from '@playwright/test';

test.describe('Settings page', () => {
  test('loads settings page with company info section', async ({ page }) => {
    await page.goto('/settings');
    await expect(
      page.getByRole('heading', { name: 'Yrityksen asetukset' }),
    ).toBeVisible();
  });

  test('shows navigation sidebar with all main sections', async ({ page }) => {
    await page.goto('/settings');
    const sidebar = page.locator('aside');
    await expect(sidebar.getByRole('link', { name: 'Tositteet' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Tase' })).toBeVisible();
    await expect(
      sidebar.getByRole('link', { name: 'Asetukset' }),
    ).toBeVisible();
  });
});
