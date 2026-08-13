import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Family Vault - Test document upload', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  const testFile = 'FamilyVault_Test_01.txt';

  console.log('========================================');
  console.log('Family Vault Upload Test');
  console.log('========================================');

  await loginPage.open();

  await loginPage.login(
    testConfig.testEmail,
    testConfig.testPassword,
  );

  await vaultPage.verifyVaultLoaded();

  const beforeCount = await vaultPage.getDocumentCount();

  console.log(`Documents before upload: ${beforeCount}`);

  await vaultPage.uploadTestDocument(
    `${process.cwd()}\\${testFile}`,
  );

  console.log('Upload operation: PASS');

  await expect(
    page.getByText(testFile, {
      exact: true,
    }),
  ).toBeVisible({
    timeout: 30000,
  });

  console.log(`Test document visible: ${testFile}`);

  const afterCount = await vaultPage.getDocumentCount();

  console.log(`Documents after upload: ${afterCount}`);

  expect(
    afterCount,
    'Document count did not increase by exactly one after upload',
  ).toBe(beforeCount + 1);

  console.log(
    `Document count comparison: ${beforeCount} → ${afterCount}`,
  );

  console.log('Overall upload test: HEALTHY');
});