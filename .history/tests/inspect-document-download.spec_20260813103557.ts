import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Inspect Family Vault document download', async ({ page }) => {
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

  // The V2 test normally cleans up the test file,
  // so create it first if it is not present.
  const document = page.getByText(
    testFileName,
    { exact: true },
  );

  if (await document.count() === 0) {
    throw new Error(
      `${testFileName} is not currently in the Vault. Run the V2 daily test first.`,
    );
  }

  await expect(document).toBeVisible();

  const documentContainer = document.locator(
    'xpath=ancestor::*[.//button][1]',
  );

  const actionButton = documentContainer.getByRole(
    'button',
  );

  await expect(actionButton).toHaveCount(1);

  await actionButton.click();

  const downloadMenuItem = page.getByRole(
    'menuitem',
    {
      name: 'Download',
      exact: true,
    },
  );

  await expect(downloadMenuItem).toBeVisible();

  console.log('========================================');
  console.log('DOCUMENT DOWNLOAD INSPECTION');
  console.log('========================================');
  console.log('Download menu item: PASS');

  // Do NOT save/modify anything yet.
  // Just determine whether clicking Download
  // produces a Playwright download event.

  const downloadPromise = page.waitForEvent(
    'download',
    {
      timeout: 10000,
    },
  );

  await downloadMenuItem.click();

  const download = await downloadPromise;

  console.log(
    `Download event: PASS`,
  );

  console.log(
    `Suggested filename: ${download.suggestedFilename()}`,
  );

  console.log(
    `Download failure: ${await download.failure()}`,
  );

  console.log('========================================');
});