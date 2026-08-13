import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Inspect Family Vault document structure', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  await loginPage.open();

  await loginPage.login(
    testConfig.testEmail,
    testConfig.testPassword,
  );

  await vaultPage.verifyVaultLoaded();

  // Allow document data to finish loading.
  await page.waitForTimeout(2000);

  console.log('========================================');
  console.log('DOCUMENT STRUCTURE INSPECTION');
  console.log('========================================');

  const bodyText = await page.locator('body').innerText();

  console.log('PAGE TEXT:');
  console.log(bodyText.substring(0, 3000));

  console.log('----------------------------------------');

  const testFile = page.getByText(
    'FamilyVault_Test_01.txt',
    { exact: true },
  );

  console.log(
    `Test document visible: ${await testFile.isVisible()}`,
  );

  console.log(
    `Test document count: ${await testFile.count()}`,
  );

  console.log('----------------------------------------');

  const allText = await page.locator('body *').allTextContents();

  console.log('Elements containing "FamilyVault_Test_01.txt":');

  for (const text of allText) {
    if (text.includes('FamilyVault_Test_01.txt')) {
      console.log(`[${text}]`);
    }
  }

  console.log('========================================');

  await page.screenshot({
    path: 'screenshots/document-structure-inspection.png',
    fullPage: true,
  });
});