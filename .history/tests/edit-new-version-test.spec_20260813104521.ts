import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Family Vault - Save document as new version', async ({ page }) => {
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

  await expect(document).toBeVisible();

  const beforeCount =
    await vaultPage.getDocumentCount();

  console.log('========================================');
  console.log('EDIT / NEW VERSION TEST');
  console.log('========================================');
  console.log(`Documents before edit: ${beforeCount}`);

  // -----------------------------------------
  // Open document action menu
  // -----------------------------------------

  const documentContainer = document.locator(
    'xpath=ancestor::*[.//button][1]',
  );

  const actionButton = documentContainer.getByRole(
    'button',
  );

  await expect(actionButton).toHaveCount(1);

  await actionButton.click();

  // -----------------------------------------
  // Open Edit
  // -----------------------------------------

  const editMenuItem = page.getByRole(
    'menuitem',
    {
      name: 'Edit (save as new version)',
      exact: true,
    },
  );

  await expect(editMenuItem).toBeVisible();

  await editMenuItem.click();

  const editDialog = page.getByRole('dialog');

  await expect(editDialog).toBeVisible();

  // Wait for the file content to load.
  await page.waitForTimeout(2000);

  // -----------------------------------------
  // Identify the actual file-content textarea
  // -----------------------------------------

  const textareas = editDialog.locator(
    'textarea:visible',
  );

  await expect(textareas).toHaveCount(2);

  const fileContent = textareas.nth(0);

  const originalContent =
    await fileContent.inputValue();

  console.log(
    `Original content: ${originalContent.trim()}`,
  );

  // -----------------------------------------
  // Make a controlled change
  // -----------------------------------------

  const newContent =
    `${originalContent.trimEnd()}\nVersion 2 test`;

  await fileContent.fill(newContent);

  console.log('File content modification: PASS');

  // -----------------------------------------
  // Save as new version
  // -----------------------------------------

  const saveVersionButton =
    editDialog.getByRole('button', {
      name: 'Save as new version',
      exact: true,
    });

  await expect(saveVersionButton).toBeVisible();

  await saveVersionButton.click();

  console.log(
    'Save as new version: CLICKED',
  );

  // Wait for the edit dialog to close.
  await expect(editDialog).not.toBeVisible({
    timeout: 30000,
  });

  // Allow Vault data to refresh.
  await page.waitForTimeout(2000);

  // -----------------------------------------
  // Verify document remains
  // -----------------------------------------

  await vaultPage.verifyDocumentPresent(
    testFileName,
  );

  console.log(
    `Document remains after versioning: ${testFileName} — PASS`,
  );

  const afterCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Documents after edit: ${afterCount}`,
  );

  // -----------------------------------------
  // Verify count
  // -----------------------------------------

  expect(
    afterCount,
    'Document count changed after creating new version',
  ).toBe(beforeCount);

  console.log(
    `Document count: ${beforeCount} → ${afterCount} — PASS`,
  );

  console.log('----------------------------------------');
  console.log('NEW VERSION TEST: HEALTHY');
  console.log('----------------------------------------');
});