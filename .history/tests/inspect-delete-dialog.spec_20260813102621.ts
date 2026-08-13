import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Inspect Family Vault delete confirmation dialog', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  const testFileName = 'FamilyVault_Test_01.txt';

  await loginPage.open();

  await loginPage.login(
    testConfig.testEmail,
    testConfig.testPassword,
  );

  await vaultPage.verifyVaultLoaded();

  await page.waitForTimeout(1000);

  const document = page.getByText(
    testFileName,
    { exact: true },
  );

  await document.scrollIntoViewIfNeeded();

  const documentContainer = document.locator(
    'xpath=ancestor::*[.//button][1]',
  );

  const actionButton = documentContainer.getByRole(
    'button',
  );

  await actionButton.click();

  const deleteMenuItem = page.getByRole(
    'menuitem',
    {
      name: 'Delete',
      exact: true,
    },
  );

  await deleteMenuItem.click();

  const deleteDialog = page.getByRole(
    'dialog',
  );

  await expect(deleteDialog).toBeVisible();

  console.log('========================================');
  console.log('DELETE DIALOG INSPECTION');
  console.log('========================================');

  console.log('Dialog text:');
  console.log(await deleteDialog.innerText());

  console.log('----------------------------------------');

  const dialogButtons =
    await deleteDialog.getByRole('button')
      .allTextContents();

  console.log('Dialog buttons:');
  console.log(dialogButtons);

  console.log('----------------------------------------');

  const buttonMetadata =
    await deleteDialog.locator('button')
      .evaluateAll((elements) =>
        elements.map((element) => ({
          text: (element.textContent || '').trim(),
          ariaLabel: element.getAttribute('aria-label'),
          title: element.getAttribute('title'),
        })),
      );

  console.log('Button metadata:');
  console.log(
    JSON.stringify(buttonMetadata, null, 2),
  );

  console.log('========================================');

  await page.screenshot({
    path: 'screenshots/delete-dialog-inspection.png',
    fullPage: true,
  });
});