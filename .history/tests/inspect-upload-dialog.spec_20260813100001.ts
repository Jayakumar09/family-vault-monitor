import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Inspect Family Vault upload dialog', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  await loginPage.open();

  await loginPage.login(
    testConfig.testEmail,
    testConfig.testPassword,
  );

  await vaultPage.verifyVaultLoaded();

  console.log('========================================');
  console.log('UPLOAD DIALOG INSPECTION');
  console.log('========================================');

  const uploadButton = page.getByRole('button', {
    name: /upload document/i,
  });

  await uploadButton.click();

  console.log('Upload Document button: CLICKED');

  // Give the dialog time to render.
  await page.waitForTimeout(500);

  const fileInputs = await page.locator('input[type="file"]').count();

  const dialogs = await page.getByRole('dialog').count();

  const buttons = await page.getByRole('button').allTextContents();

  console.log(`File input count after opening dialog: ${fileInputs}`);
  console.log(`Dialog count: ${dialogs}`);

  console.log('Visible buttons:');
  console.log(buttons);

  console.log('----------------------------------------');

  const bodyText = await page.locator('body').innerText();

  console.log('Upload dialog/page text:');
  console.log(bodyText.substring(0, 2000));

  console.log('========================================');

  await page.screenshot({
    path: 'screenshots/upload-dialog-inspection.png',
    fullPage: true,
  });
});