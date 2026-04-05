const { seedRealisticDatabase } = require('./seed-demo-db.cjs');

seedRealisticDatabase({
  slug: process.env.PLAYWRIGHT_E2E_SOURCE_SLUG || '__playwright_e2e__',
  companyName: 'Playwright E2E Oy',
  businessId: '3478621-5',
  signerName: 'Playwright Tester',
  place: 'Oulu',
});
