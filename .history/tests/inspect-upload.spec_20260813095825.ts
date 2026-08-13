import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Inspect Family Vault upload controls', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  await loginPage.open();
  await loginPage.login(
    testConfig.testEmail,
    testConfig.testPassword,
  );

  await vaultPage.verifyVaultLoaded();

  console.log('========================================');
  console.log('UPLOAD CONTROL INSPECTION');
  console.log('========================================');

  const fileInputs = await page.locator('input[type="file"]').count();

  console.log(`File input count: ${fileInputs}`);

  const uploadButtons = await page
    .getByRole('button', { name: /upload document/i })
    .count();

  console.log(`Upload Document button count: ${uploadButtons}`);

  const uploadTexts = await page
    .getByText('Upload Document', { exact: true })
    .count();

  console.log(`Upload Document text count: ${uploadTexts}`);

  console.log('========================================');

  await page.screenshot({
    path: 'screenshots/upload-control-inspection.png',
    fullPage: true,
  });
});