import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Cleanup accidental Passport duplicate documents', async ({
  page,
}) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  const testFileName = 'Passport (front).pdf';

  console.log('========================================');
  console.log('PASSPORT DUPLICATE CLEANUP');
  console.log('========================================');
  console.log(`Target document: ${testFileName}`);
  console.log('----------------------------------------');

  // -----------------------------------------
  // Step 1: Login
  // -----------------------------------------

  await loginPage.open();

  await loginPage.login(
    testConfig.testEmail,
    testConfig.testPassword,
  );

  console.log('Login: PASS');

  // -----------------------------------------
  // Step 2: Verify Vault
  // -----------------------------------------

  await vaultPage.verifyVaultLoaded();

  console.log('Vault: PASS');

  // -----------------------------------------
  // Step 3: Count Passport documents
  // -----------------------------------------

  const passportDocument =
    page.getByText(
      testFileName,
      {
        exact: true,
      },
    );

  const beforeCount =
    await passportDocument.count();

  console.log(
    `Passport documents before cleanup: ${beforeCount}`,
  );

  expect(
    beforeCount,
    'Expected at least one Passport document before cleanup',
  ).toBeGreaterThan(0);

  // -----------------------------------------
  // Step 4: Delete only Passport documents
  // -----------------------------------------

  let deletedCount = 0;

  while (true) {
    const currentCount =
      await passportDocument.count();

    if (currentCount === 0) {
      break;
    }

    console.log(
      `Deleting Passport document ${deletedCount + 1}...`,
    );

    await vaultPage.deleteTestDocument(
      testFileName,
    );

    deletedCount++;

    console.log(
      `Deleted Passport document ${deletedCount}: PASS`,
    );

    // Safety limit: this cleanup is expected
    // to remove the two accidental duplicates.
    if (deletedCount >= 10) {
      throw new Error(
        'Safety limit reached while deleting Passport documents.',
      );
    }
  }

  // -----------------------------------------
  // Step 5: Verify all Passport copies removed
  // -----------------------------------------

  const afterCount =
    await passportDocument.count();

  console.log(
    `Passport documents after cleanup: ${afterCount}`,
  );

  expect(
    afterCount,
    'Passport documents still remain in Vault',
  ).toBe(0);

  // -----------------------------------------
  // Step 6: Verify total Vault count
  // -----------------------------------------

  const finalVaultCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Total Vault documents after cleanup: ${finalVaultCount}`,
  );

  expect(
    finalVaultCount,
    'Vault should return to zero documents after cleanup',
  ).toBe(0);

  console.log('----------------------------------------');
  console.log(
    `Passport duplicate cleanup: ${deletedCount} deleted`,
  );
  console.log(
    'Vault baseline: 0 documents',
  );
  console.log(
    'CLEANUP STATUS: HEALTHY',
  );
  console.log('========================================');
});