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

  const beforeCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Documents before cleanup: ${beforeCount}`,
  );

  for (const fileName of testFiles) {
    const document = page.getByText(
      fileName,
      { exact: true },
    );

    if (await document.count() === 0) {
      console.log(
        `${fileName}: NOT FOUND — SKIPPED`,
      );
      continue;
    }

    await expect(document).toBeVisible();

    await vaultPage.deleteTestDocument(fileName);

    console.log(
      `Deleted: ${fileName} — PASS`,
    );

    await page.waitForTimeout(1000);
  }

  const afterCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Documents after cleanup: ${afterCount}`,
  );

  for (const fileName of testFiles) {
    await expect(
      page.getByText(fileName, {
        exact: true,
      }),
    ).not.toBeVisible();
  }

  console.log(
    `Cleanup count comparison: ${beforeCount} → ${afterCount}`,
  );

  expect(
    afterCount,
    'Vault did not return to zero documents',
  ).toBe(0);

  console.log('----------------------------------------');
  console.log('All test documents removed: PASS');
  console.log('Vault baseline: 0 documents');
  console.log('Overall cleanup status: HEALTHY');
  console.log('----------------------------------------');
});