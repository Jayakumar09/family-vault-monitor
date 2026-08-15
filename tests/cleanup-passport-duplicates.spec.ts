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
  // Step 3: Wait for Vault document data
  // -----------------------------------------

  await page.getByText(
    /documents?\s+secured/i,
  ).first().waitFor({
    state: 'visible',
    timeout: 15000,
  });

  // Allow the Vault's document data to finish rendering.
  await page.waitForTimeout(1000);

  // -----------------------------------------
  // Step 4: Capture Vault baseline
  // -----------------------------------------

  const initialVaultCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Total Vault documents before cleanup: ${initialVaultCount}`,
  );

  // -----------------------------------------
  // Step 5: Count Passport documents
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
    `Expected Passport documents before cleanup, but found ${beforeCount}`,
  ).toBeGreaterThan(0);

  // -----------------------------------------
  // Step 6: Delete only Passport documents
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

    // Safety limit.
    if (deletedCount >= 10) {
      throw new Error(
        'Safety limit reached while deleting Passport documents.',
      );
    }

    // Give the Vault time to update its document list.
    await page.waitForTimeout(1000);
  }

  // -----------------------------------------
  // Step 7: Verify Passport copies removed
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
  // Step 8: Verify only targeted documents
  // were removed
  // -----------------------------------------

  const finalVaultCount =
    await vaultPage.getDocumentCount();

  const expectedFinalVaultCount =
    initialVaultCount -
    deletedCount;

  console.log(
    `Total Vault documents after cleanup: ${finalVaultCount}`,
  );

  console.log(
    `Expected Vault documents after cleanup: ${expectedFinalVaultCount}`,
  );

  expect(
    finalVaultCount,
    'Unexpected Vault document count after Passport cleanup',
  ).toBe(
    expectedFinalVaultCount,
  );

  // -----------------------------------------
  // Step 9: Final cleanup verification
  // -----------------------------------------

  console.log('----------------------------------------');
  console.log(
    `Passport duplicate cleanup: ${deletedCount} deleted`,
  );

  console.log(
    `Vault baseline: ${initialVaultCount} documents`,
  );

  console.log(
    `Vault final count: ${finalVaultCount} documents`,
  );

  console.log(
    'Unrelated Vault documents preserved: PASS',
  );

  console.log(
    'CLEANUP STATUS: HEALTHY',
  );

  console.log('========================================');
});
