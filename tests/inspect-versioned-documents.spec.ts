import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Inspect Family Vault versioned documents', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  await loginPage.open();

  await loginPage.login(
    testConfig.testEmail,
    testConfig.testPassword,
  );

  await vaultPage.verifyVaultLoaded();

  await page.waitForTimeout(2000);

  console.log('========================================');
  console.log('VERSIONED DOCUMENT INSPECTION');
  console.log('========================================');

  const documentCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Total documents: ${documentCount}`,
  );

  console.log('----------------------------------------');

  const bodyText = await page.locator('body').innerText();

  console.log(
    bodyText.substring(0, 5000),
  );

  console.log('----------------------------------------');

  const fileNames = await page.locator(
    'text=FamilyVault_Test_01',
  ).allTextContents();

  console.log('Matching test document entries:');

  console.log(fileNames);

  console.log('========================================');
});