import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Inspect Family Vault document actions', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  const testFileName = 'FamilyVault_Test_01.txt';

  await loginPage.open();

  await loginPage.login(
    testConfig.testEmail,
    testConfig.testPassword,
  );

  await vaultPage.verifyVaultLoaded();

  // Allow document data to finish rendering.
  await page.waitForTimeout(1500);

  console.log('========================================');
  console.log('DOCUMENT ACTION INSPECTION');
  console.log('========================================');

  const document = page.getByText(
    testFileName,
    { exact: true },
  );

  await document.scrollIntoViewIfNeeded();

  console.log(`Test document visible: ${await document.isVisible()}`);

  // Find the closest useful container around the document.
  const documentContainer = document.locator(
    'xpath=ancestor::*[.//button][1]',
  );

  console.log(
    `Document action container count: ${await documentContainer.count()}`,
  );

  if (await documentContainer.count() > 0) {
    const buttons = await documentContainer
      .getByRole('button')
      .allTextContents();

    console.log('Buttons in document container:');
    console.log(buttons);

    const titles = await documentContainer
      .locator('button')
      .evaluateAll((elements) =>
        elements.map((element) => ({
          text: (element.textContent || '').trim(),
          ariaLabel: element.getAttribute('aria-label'),
          title: element.getAttribute('title'),
        })),
      );

    console.log('Button metadata:');
    console.log(JSON.stringify(titles, null, 2));
  }

  console.log('----------------------------------------');

  const allButtons = await page.getByRole('button').allTextContents();

  console.log('All visible button text:');
  console.log(allButtons);

  console.log('========================================');

  await page.screenshot({
    path: 'screenshots/document-actions-inspection.png',
    fullPage: true,
  });
});