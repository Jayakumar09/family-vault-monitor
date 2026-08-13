import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Inspect Family Vault delete confirmation', async ({ page }) => {
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

  const deleteMenuItem = page.getByRole(
    'menuitem',
    {
      name: 'Delete',
      exact: true,
    },
  );

  await expect(deleteMenuItem).toBeVisible();

  // -----------------------------------------
  // Inspect native browser confirmation
  // -----------------------------------------

  page.once('dialog', async (dialog) => {
    console.log('========================================');
    console.log('NATIVE BROWSER DIALOG DETECTED');
    console.log('========================================');
    console.log(`Dialog type: ${dialog.type()}`);
    console.log(`Dialog message: ${dialog.message()}`);
    console.log('========================================');

    // IMPORTANT:
    // Dismiss instead of accepting.
    await dialog.dismiss();
  });

  await deleteMenuItem.click();

  // Give the application time to render any custom confirmation.
  await page.waitForTimeout(1000);

  console.log('========================================');
  console.log('DELETE CONFIRMATION INSPECTION');
  console.log('========================================');

  // Inspect possible ARIA roles.
  console.log(
    `Dialog count: ${await page.getByRole('dialog').count()}`,
  );

  console.log(
    `Alert count: ${await page.getByRole('alert').count()}`,
  );

  console.log(
    `Alertdialog count: ${await page.getByRole('alertdialog').count()}`,
  );

  // Inspect visible text.
  const bodyText = await page.locator('body').innerText();

  console.log('----------------------------------------');
  console.log('PAGE TEXT AFTER DELETE CLICK:');
  console.log(bodyText.substring(0, 3000));

  // Inspect visible buttons.
  console.log('----------------------------------------');
  console.log('VISIBLE BUTTONS:');

  const buttons = await page.getByRole('button').allTextContents();

  console.log(buttons);

  console.log('----------------------------------------');

  const buttonMetadata = await page
    .locator('button:visible')
    .evaluateAll((elements) =>
      elements.map((element) => ({
        text: (element.textContent || '').trim(),
        ariaLabel: element.getAttribute('aria-label'),
        title: element.getAttribute('title'),
      })),
    );

  console.log(
    JSON.stringify(buttonMetadata, null, 2),
  );

  console.log('========================================');

  await page.screenshot({
    path: 'screenshots/delete-confirmation-inspection.png',
    fullPage: true,
  });
});