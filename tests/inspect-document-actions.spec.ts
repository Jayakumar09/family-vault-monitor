import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';
import {
  TEST_DOCUMENT_NAME,
  ensureTestDocument,
  cleanupTestDocument,
} from './helpers/test-document';

test(
  'Inspect Family Vault document actions',
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

      // Allow document data to finish rendering.
      await page.waitForTimeout(1500);

      console.log(
        '========================================',
      );

      console.log(
        'DOCUMENT ACTION INSPECTION',
      );

      console.log(
        '========================================',
      );

      const document =
        page.getByText(
          TEST_DOCUMENT_NAME,
          {
            exact: true,
          },
        );

      await document.scrollIntoViewIfNeeded();

      console.log(
        `Test document visible: ${
          await document.isVisible()
        }`,
      );

      // -----------------------------------------
      // Find closest useful container
      // -----------------------------------------

      const documentContainer =
        document.locator(
          'xpath=ancestor::*[.//button][1]',
        );

      console.log(
        `Document action container count: ${
          await documentContainer.count()
        }`,
      );

      if (
        await documentContainer.count() >
        0
      ) {
        const buttons =
          await documentContainer
            .getByRole('button')
            .allTextContents();

        console.log(
          'Buttons in document container:',
        );

        console.log(
          buttons,
        );

        const titles =
          await documentContainer
            .locator('button')
            .evaluateAll(
              (elements) =>
                elements.map(
                  (element) => ({
                    text:
                      (
                        element.textContent ||
                        ''
                      ).trim(),

                    ariaLabel:
                      element.getAttribute(
                        'aria-label',
                      ),

                    title:
                      element.getAttribute(
                        'title',
                      ),
                  }),
                ),
            );

        console.log(
          'Button metadata:',
        );

        console.log(
          JSON.stringify(
            titles,
            null,
            2,
          ),
        );
      }

      console.log(
        '----------------------------------------',
      );

      const allButtons =
        await page
          .getByRole('button')
          .allTextContents();

      console.log(
        'All visible button text:',
      );

      console.log(
        allButtons,
      );

      console.log(
        '========================================',
      );

      await page.screenshot({
        path:
          'screenshots/document-actions-inspection.png',
        fullPage: true,
      });
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