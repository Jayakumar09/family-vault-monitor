import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Inspect Family Vault document edit workflow', async ({ page }) => {
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

  const documentContainer = document.locator(
    'xpath=ancestor::*[.//button][1]',
  );

  const actionButton = documentContainer.getByRole(
    'button',
  );

  await expect(actionButton).toHaveCount(1);

  await actionButton.click();

  const editMenuItem = page.getByRole(
    'menuitem',
    {
      name: 'Edit (save as new version)',
      exact: true,
    },
  );

  await expect(editMenuItem).toBeVisible();

  await editMenuItem.click();

  await page.waitForTimeout(3000);

    console.log('----------------------------------------');
  console.log('EDIT CONTENT INSPECTION:');

  const visibleTextareas = await page
    .locator('textarea:visible')
    .count();

  console.log(
    `Visible textarea count: ${visibleTextareas}`,
  );

  if (visibleTextareas > 0) {
    const textareaValues = await page
      .locator('textarea:visible')
      .evaluateAll((elements) =>
        elements.map((element) => ({
          placeholder: element.getAttribute('placeholder'),
          value: (element as HTMLTextAreaElement).value,
        })),
      );

    console.log(
      JSON.stringify(textareaValues, null, 2),
    );
  }

  const contentEditableCount = await page
    .locator('[contenteditable="true"]:visible')
    .count();

  console.log(
    `Visible contenteditable count: ${contentEditableCount}`,
  );

  console.log('========================================');

});