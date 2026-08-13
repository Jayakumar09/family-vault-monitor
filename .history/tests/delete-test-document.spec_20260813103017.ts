import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Family Vault - Delete test document safely', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  const testFileName = 'FamilyVault_Test_01.txt';

  console.log('========================================');
  console.log('Family Vault Test Document Cleanup');
  console.log('========================================');

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
  // Step 3: Get count before deletion
  // -----------------------------------------

  const beforeCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Documents before deletion: ${beforeCount}`,
  );

  // -----------------------------------------
  // Step 4: Verify test document exists
  // -----------------------------------------

  await vaultPage.verifyDocumentPresent(
    testFileName,
  );

  console.log(
    `Test document found: ${testFileName}`,
  );

  // -----------------------------------------
  // Step 5: Delete test document
  // -----------------------------------------

  await vaultPage.deleteTestDocument(
    testFileName,
  );

  console.log('Delete operation: PASS');

  // -----------------------------------------
  // Step 6: Allow Vault to refresh
  // -----------------------------------------

  await page.waitForTimeout(1000);

  // -----------------------------------------
  // Step 7: Get count after deletion
  // -----------------------------------------

  const afterCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Documents after deletion: ${afterCount}`,
  );

  // -----------------------------------------
  // Step 8: Verify document is gone
  // -----------------------------------------

  await expect(
    page.getByText(testFileName, {
      exact: true,
    }),
  ).not.toBeVisible();

  console.log(
    `Test document removed: ${testFileName} — PASS`,
  );

  // -----------------------------------------
  // Step 9: Verify count decreased by one
  // -----------------------------------------

  expect(
    afterCount,
    'Document count did not decrease by exactly one',
  ).toBe(beforeCount - 1);

  console.log(
    `Document count comparison: ${beforeCount} → ${afterCount}`,
  );

  // -----------------------------------------
  // Final status
  // -----------------------------------------

  console.log('----------------------------------------');
  console.log('Cleanup: PASS');
  console.log('Overall V1.5 status: HEALTHY');
  console.log('----------------------------------------');
});