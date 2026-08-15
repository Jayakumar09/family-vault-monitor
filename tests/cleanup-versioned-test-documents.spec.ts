import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Family Vault - Cleanup versioned test documents', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  const testFiles = [
    'FamilyVault_Test_01_v2.txt',
    'FamilyVault_Test_01.txt',
  ];

  console.log('========================================');
  console.log('VERSIONED TEST DOCUMENT CLEANUP');
  console.log('========================================');

  await loginPage.open();

  await loginPage.login(
    testConfig.testEmail,
    testConfig.testPassword,
  );

  console.log('Login: PASS');

  await vaultPage.verifyVaultLoaded();

  console.log('Vault: PASS');

  // -----------------------------------------
  // Capture Vault baseline
  // -----------------------------------------

  const beforeCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Documents before cleanup: ${beforeCount}`,
  );

  // -----------------------------------------
  // Delete only targeted test documents
  // -----------------------------------------

  let deletedCount = 0;

  for (const fileName of testFiles) {
    const document = page.getByText(
      fileName,
      { exact: true },
    );

    const matchCount =
      await document.count();

    if (matchCount === 0) {
      console.log(
        `${fileName}: NOT FOUND — SKIPPED`,
      );
      continue;
    }

    await expect(document.first()).toBeVisible();

    await vaultPage.deleteTestDocument(
      fileName,
    );

    deletedCount++;

    console.log(
      `Deleted: ${fileName} — PASS`,
    );

    await page.waitForTimeout(1000);
  }

  // -----------------------------------------
  // Verify targeted documents are removed
  // -----------------------------------------

  for (const fileName of testFiles) {
    const document = page.getByText(
      fileName,
      { exact: true },
    );

    expect(
      await document.count(),
      `${fileName} still exists in Vault`,
    ).toBe(0);
  }

  // -----------------------------------------
  // Verify only targeted documents were removed
  // -----------------------------------------

  const afterCount =
    await vaultPage.getDocumentCount();

  const expectedAfterCount =
    beforeCount -
    deletedCount;

  console.log(
    `Documents after cleanup: ${afterCount}`,
  );

  console.log(
    `Expected documents after cleanup: ${expectedAfterCount}`,
  );

  expect(
    afterCount,
    'Unexpected Vault document count after versioned test cleanup',
  ).toBe(
    expectedAfterCount,
  );

  console.log('----------------------------------------');

  console.log(
    `Versioned test documents deleted: ${deletedCount}`,
  );

  console.log(
    `Vault baseline: ${beforeCount} documents`,
  );

  console.log(
    `Vault final count: ${afterCount} documents`,
  );

  console.log(
    'Unrelated Vault documents preserved: PASS',
  );

  console.log(
    'Overall cleanup status: HEALTHY',
  );

  console.log('----------------------------------------');
});
