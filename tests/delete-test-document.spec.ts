import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';
import path from 'path';

test('Family Vault - Delete test document safely', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  const testFileName =
    'FamilyVault_Test_01.txt';

  const filePath =
    path.resolve(
      process.cwd(),
      testFileName,
    );

  console.log('========================================');
  console.log('Family Vault Test Document Cleanup');
  console.log('========================================');
  console.log(
    `Test document: ${testFileName}`,
  );

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
  // Step 3: Ensure test document exists
  // -----------------------------------------

  let existingCount =
    await vaultPage.getDocumentMatchCount(
      testFileName,
    );

  console.log(
    `Test document matches before setup: ${existingCount}`,
  );

  if (existingCount === 0) {
    console.log(
      'Test document not found — uploading fixture...',
    );

    await vaultPage.uploadTestDocument(
      filePath,
    );

    console.log(
      'Test document upload: PASS',
    );

    await vaultPage.verifyDocumentPresent(
      testFileName,
    );

    await page.waitForTimeout(1000);

    existingCount =
      await vaultPage.getDocumentMatchCount(
        testFileName,
      );

    console.log(
      `Test document matches after setup: ${existingCount}`,
    );
  }

  // -----------------------------------------
  // Step 4: Verify exactly one copy exists
  // -----------------------------------------

  expect(
    existingCount,
    `Expected exactly one copy of ${testFileName}, found ${existingCount}`,
  ).toBe(1);

  console.log(
    `Exactly one test document exists: PASS`,
  );

  // -----------------------------------------
  // Step 5: Get count before deletion
  // -----------------------------------------

  const beforeCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Documents before deletion: ${beforeCount}`,
  );

  // -----------------------------------------
  // Step 6: Delete test document
  // -----------------------------------------

  await vaultPage.deleteTestDocument(
    testFileName,
  );

  console.log(
    'Delete operation: PASS',
  );

  // -----------------------------------------
  // Step 7: Allow Vault to refresh
  // -----------------------------------------

  await page.waitForTimeout(1000);

  // -----------------------------------------
  // Step 8: Verify document is gone
  // -----------------------------------------

  const afterMatchCount =
    await vaultPage.getDocumentMatchCount(
      testFileName,
    );

  console.log(
    `Test document matches after deletion: ${afterMatchCount}`,
  );

  expect(
    afterMatchCount,
    `${testFileName} still exists after deletion`,
  ).toBe(0);

  console.log(
    `Test document removed: ${testFileName} — PASS`,
  );

  // -----------------------------------------
  // Step 9: Verify Vault count decreased
  // -----------------------------------------

  const afterCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Documents after deletion: ${afterCount}`,
  );

  expect(
    afterCount,
    'Document count did not decrease by exactly one',
  ).toBe(
    beforeCount - 1,
  );

  console.log(
    `Document count comparison: ${beforeCount} → ${afterCount}`,
  );

  // -----------------------------------------
  // Final status
  // -----------------------------------------

  console.log('----------------------------------------');
  console.log(
    'Test document deletion: PASS',
  );
  console.log(
    'Unrelated Vault documents preserved: PASS',
  );
  console.log(
    'Overall delete test status: HEALTHY',
  );
  console.log('----------------------------------------');
});
