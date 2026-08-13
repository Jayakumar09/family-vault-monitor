import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';
import path from 'path';

test('Family Vault - Image upload, download, and cleanup', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  const testFileName = 'FamilyVault_Test_Image.png';

  const filePath = path.resolve(
    process.cwd(),
    testFileName,
  );

  console.log('========================================');
  console.log('FAMILY VAULT IMAGE TEST');
  console.log('========================================');
  console.log(`Test file: ${testFileName}`);
  console.log(`File path: ${filePath}`);

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

  const beforeCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Documents before upload: ${beforeCount}`,
  );

  // -----------------------------------------
  // Step 3: Upload Image
  // -----------------------------------------

  await vaultPage.uploadTestDocument(filePath);

  console.log('Image upload: PASS');

  // -----------------------------------------
  // Step 4: Verify Image
  // -----------------------------------------

  await expect(
    page.getByText(testFileName, {
      exact: true,
    }),
  ).toBeVisible();

  console.log(
    `Image visible: ${testFileName} — PASS`,
  );

  const afterUploadCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Documents after upload: ${afterUploadCount}`,
  );

  expect(afterUploadCount).toBe(
    beforeCount + 1,
  );

  console.log(
    `Upload count: ${beforeCount} → ${afterUploadCount} — PASS`,
  );

  // -----------------------------------------
  // Step 5: Download Image
  // -----------------------------------------

  const document =
    page.getByText(testFileName, {
      exact: true,
    });

  const documentContainer =
    document.locator(
      'xpath=ancestor::*[.//button][1]',
    );

  const actionButton =
    documentContainer.getByRole('button');

  await actionButton.click();

  const downloadMenuItem =
    page.getByRole('menuitem', {
      name: 'Download',
      exact: true,
    });

  await expect(downloadMenuItem).toBeVisible();

  const downloadPromise =
    page.waitForEvent('download');

  await downloadMenuItem.click();

  const download =
    await downloadPromise;

  console.log('Download operation: PASS');

  console.log(
    `Suggested filename: ${download.suggestedFilename()}`,
  );

  expect(
    download.suggestedFilename(),
  ).toBe(testFileName);

  console.log(
    'Downloaded filename: PASS',
  );

  // -----------------------------------------
  // Step 6: Cleanup
  // -----------------------------------------

  await vaultPage.deleteTestDocument(
    testFileName,
  );

  console.log(
    `Image deletion: ${testFileName} — PASS`,
  );

  const afterCleanupCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Documents after cleanup: ${afterCleanupCount}`,
  );

  expect(afterCleanupCount).toBe(
    beforeCount,
  );

  await expect(
    page.getByText(testFileName, {
      exact: true,
    }),
  ).not.toBeVisible();

  console.log(
    `Cleanup count: ${afterUploadCount} → ${afterCleanupCount} — PASS`,
  );

  console.log('----------------------------------------');
  console.log('IMAGE TEST: HEALTHY');
  console.log('----------------------------------------');
});