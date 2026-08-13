import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Inspect Family Vault document action menu', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  const testFileName = 'FamilyVault_Test_01.txt';

  await loginPage.open();

  await loginPage.login(
    testConfig.testEmail,
    testConfig.testPassword,
  );

  await vaultPage.verifyVaultLoaded();

  await page.waitForTimeout(1500);

  const document = page.getByText(
    testFileName,
    { exact: true },
  );

  await document.scrollIntoViewIfNeeded();

  const documentContainer = document.locator(
    'xpath=ancestor::*[.//button][1]',
  );

  const actionButton = documentContainer.getByRole('button');

  console.log('========================================');
  console.log('DOCUMENT ACTION MENU INSPECTION');
  console.log('========================================');

  console.log(
    `Action button count: ${await actionButton.count()}`,
  );

  if (await actionButton.count() !== 1) {
    throw new Error(
      `Expected exactly 1 document action button, found ${await actionButton.count()}`,
    );
  }

  await actionButton.click();

  console.log('Document action button: CLICKED');

  await page.waitForTimeout(500);

  console.log('----------------------------------------');

  const menuCount = await page.getByRole('menu').count();

  console.log(`Menu count: ${menuCount}`);

  const menuItems = await page
    .getByRole('menuitem')
    .allTextContents();

  console.log('Menu items:');
  console.log(menuItems);

  console.log('----------------------------------------');

  const visibleText = await page.locator('body').innerText();

  console.log('Page text after opening action menu:');
  console.log(visibleText.substring(0, 3000));

  console.log('========================================');

  await page.screenshot({
    path: 'screenshots/document-action-menu-inspection.png',
    fullPage: true,
  });
});