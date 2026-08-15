import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';
import {
  TEST_DOCUMENT_NAME,
  ensureTestDocument,
  cleanupTestDocument,
} from './helpers/test-document';

test(
  'Inspect Family Vault document download',
  async ({ page }) => {
    const loginPage =
      new LoginPage(page);

    const vaultPage =
      new VaultPage(page);

    let initialVaultCount = 0;
    let testDocumentCreated = false;

    try {
      // -----------------------------------------
      // Login
      // -----------------------------------------

      await loginPage.open();

      await loginPage.login(
        testConfig.testEmail,
        testConfig.testPassword,
      );

      await vaultPage.verifyVaultLoaded();

      // -----------------------------------------
      // Ensure test document exists
      // -----------------------------------------

      const setup =
        await ensureTestDocument(
          vaultPage,
        );

      initialVaultCount =
        setup.initialVaultCount;

      testDocumentCreated =
        setup.testDocumentCreated;

      await page.waitForTimeout(1500);

      const document =
        page.getByText(
          TEST_DOCUMENT_NAME,
          {
            exact: true,
          },
        );

      await expect(
        document,
      ).toBeVisible();

      const documentContainer =
        document.locator(
          'xpath=ancestor::*[.//button][1]',
        );

      const actionButton =
        documentContainer.getByRole(
          'button',
        );

      await expect(
        actionButton,
      ).toHaveCount(1);

      await actionButton.click();

      // -----------------------------------------
      // Find Download action
      // -----------------------------------------

      const downloadMenuItem =
        page.getByRole(
          'menuitem',
          {
            name: 'Download',
            exact: true,
          },
        );

      await expect(
        downloadMenuItem,
      ).toBeVisible();

      console.log(
        '========================================',
      );

      console.log(
        'DOCUMENT DOWNLOAD INSPECTION',
      );

      console.log(
        '========================================',
      );

      console.log(
        'Download menu item: PASS',
      );

      // -----------------------------------------
      // Inspect download event only
      // -----------------------------------------

      const downloadPromise =
        page.waitForEvent(
          'download',
          {
            timeout: 10000,
          },
        );

      await downloadMenuItem.click();

      const download =
        await downloadPromise;

      console.log(
        'Download event: PASS',
      );

      console.log(
        `Suggested filename: ${
          download.suggestedFilename()
        }`,
      );

      console.log(
        `Download failure: ${
          await download.failure()
        }`,
      );

      console.log(
        '========================================',
      );
    } finally {
      // -----------------------------------------
      // Restore stable Vault page before cleanup
      // -----------------------------------------

      if (testDocumentCreated) {
        await page.reload();

        await vaultPage.verifyVaultLoaded();
      }

      // -----------------------------------------
      // Cleanup only test-created document
      // -----------------------------------------

      await cleanupTestDocument(
        vaultPage,
        initialVaultCount,
        testDocumentCreated,
      );
    }
  },
);