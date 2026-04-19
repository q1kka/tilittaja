import fs from 'fs';
import path from 'path';
import { once } from 'events';
import PDFDocument from 'pdfkit';
import { test, expect } from '@playwright/test';

async function createPlaceholderBankStatementPdf(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const doc = new PDFDocument({ size: 'A4', margin: 56 });
  const output = fs.createWriteStream(filePath);
  doc.pipe(output);

  doc.fontSize(22).text('Placeholder tiliote PDF');
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#444').text('Tama PDF on tarkoitettu import-flow n testaukseen.');
  doc.moveDown();
  doc.fillColor('#000').fontSize(14).text('Pankki: Tunturi Pankki Oyj');
  doc.text('IBAN: FI55 1234 5600 7777 88');
  doc.text('Kausi: 01.04.2026 - 30.04.2026');
  doc.moveDown();
  doc.text('Esimerkkirivit:');
  doc.text('- 02.04.2026 Playwright Asiakas Oy +300,00 EUR');
  doc.text('- 03.04.2026 Playwright Kulut Oy -74,50 EUR');
  doc.moveDown();
  doc.fillColor('#666').fontSize(10).text('Tallennettu vain testin placeholder-sisalloksi.');
  doc.end();

  await once(output, 'finish');
}

function importedPeriodLabel(): string {
  const year = new Date().getUTCFullYear();
  return `01.04.${year} – 30.04.${year}`;
}

test.describe('Bank statement import', () => {
  test('imports a bank statement PDF through the full UI flow', async ({
    page,
  }, testInfo) => {
    const pdfPath = testInfo.outputPath('playwright-bank-statement.pdf');
    await createPlaceholderBankStatementPdf(pdfPath);

    await page.goto('/bank-statements');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Tiliotteet', exact: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Lisää tiliote' }).click();

    const dialog = page.getByRole('dialog', { name: 'Tuo tiliote PDF:stä' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Kohdepankkitili')).toBeVisible();
    await expect(dialog.getByText('PDF-tiedostot')).toBeVisible();

    await dialog.locator('input[type="file"]').first().setInputFiles(pdfPath);

    await expect(
      dialog.getByText('1 PDF-tiedostoa valittu tuotavaksi'),
    ).toBeVisible();
    await expect(
      dialog.getByText('playwright-bank-statement.pdf'),
    ).toBeVisible();

    await dialog.getByRole('button', { name: 'Tuo tiliotteet' }).click();

    await page.waitForURL(/\/bank-statements\/\d+$/);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: `Tiliote ${importedPeriodLabel()}` }),
    ).toBeVisible();
    await expect(page.getByText('1910 Kassa')).toBeVisible();
    await expect(page.getByText('FI55 1234 5600 7777 88')).toBeVisible();

    await expect(page.getByText('Playwright Asiakas Oy')).toBeVisible();
    await expect(page.getByText('Playwright testimaksu')).toBeVisible();
    await expect(page.getByText('Playwright Kulut Oy')).toBeVisible();
    await expect(page.getByText('Playwright palvelumaksu')).toBeVisible();

    await expect(page.getByRole('link', { name: 'Avaa PDF' })).toBeVisible();
    await expect(page.locator('iframe[title*=" PDF"]')).toBeVisible();
  });
});
