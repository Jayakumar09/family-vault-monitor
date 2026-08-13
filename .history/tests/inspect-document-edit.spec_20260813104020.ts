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

  await page.waitForTimeout(500);

  console.log('========================================');
  console.log('DOCUMENT EDIT INSPECTION');
  console.log('========================================');

  console.log(
    `Dialog count: ${await page.getByRole('dialog').count()}`,
  );

  console.log('----------------------------------------');

  const bodyText = await page.locator('body').innerText();

  console.log('PAGE TEXT AFTER EDIT CLICK:');
  console.log(bodyText.substring(0, 3000));

  console.log('----------------------------------------');

  console.log('VISIBLE BUTTONS:');

  const buttons = await page
    .getByRole('button')
    .allTextContents();

  console.log(buttons);

  console.log('----------------------------------------');

  const visibleInputs = await page
    .locator('input:visible, textarea:visible')
    .evaluateAll((elements) =>
      elements.map((element) => ({
        tag: element.tagName,
        type: element.getAttribute('type'),
        name: element.getAttribute('name'),
        id: element.getAttribute('id'),
        placeholder: element.getAttribute('placeholder'),
        value: (element as HTMLInputElement).value,
      })),
    );

  console.log('VISIBLE INPUTS:');
  console.log(
    JSON.stringify(visibleInputs, null, 2),
  );

  console.log('========================================');

  await page.screenshot({
    path: 'screenshots/document-edit-inspection.png',
    fullPage: true,
  });
});