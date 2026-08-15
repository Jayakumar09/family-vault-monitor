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
  'Inspect Family Vault document edit workflow',
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
      // Open edit workflow
      // -----------------------------------------

      const editMenuItem =
        page.getByRole(
          'menuitem',
          {
            name:
              'Edit (save as new version)',
            exact: true,
          },
        );

      await expect(
        editMenuItem,
      ).toBeVisible();

      await editMenuItem.click();

      await page.waitForTimeout(3000);

      console.log(
        '----------------------------------------',
      );

      console.log(
        'EDIT CONTENT INSPECTION:',
      );

      // -----------------------------------------
      // Inspect visible textareas
      // -----------------------------------------

      const visibleTextareas =
        await page
          .locator(
            'textarea:visible',
          )
          .count();

      console.log(
        `Visible textarea count: ${visibleTextareas}`,
      );

      if (
        visibleTextareas > 0
      ) {
        const textareaValues =
          await page
            .locator(
              'textarea:visible',
            )
            .evaluateAll(
              (elements) =>
                elements.map(
                  (element) => ({
                    placeholder:
                      element.getAttribute(
                        'placeholder',
                      ),

                    value:
                      (
                        element as
                          HTMLTextAreaElement
                      ).value,
                  }),
                ),
            );

        console.log(
          JSON.stringify(
            textareaValues,
            null,
            2,
          ),
        );
      }

      // -----------------------------------------
      // Inspect contenteditable elements
      // -----------------------------------------

      const contentEditableCount =
        await page
          .locator(
            '[contenteditable="true"]:visible',
          )
          .count();

      console.log(
        `Visible contenteditable count: ${contentEditableCount}`,
      );

      console.log(
        '========================================',
      );

      // IMPORTANT:
      // Do not save a new version.
    } finally {
      // -----------------------------------------
      // Reload first because edit dialog may
      // still be open.
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