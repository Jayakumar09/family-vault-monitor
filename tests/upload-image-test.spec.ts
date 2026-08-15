import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';
import path from 'path';

test(
  'Family Vault - Image upload, download, and cleanup',
  async ({ page }) => {
    const loginPage =
      new LoginPage(page);

    const vaultPage =
      new VaultPage(page);

    const testFileName =
      'FamilyVault_Test_Image.png';

    const filePath =
      path.resolve(
        process.cwd(),
        testFileName,
      );

    let testDocumentCreated =
      false;

    console.log(
      '========================================',
    );

    console.log(
      'FAMILY VAULT IMAGE TEST',
    );

    console.log(
      '========================================',
    );

    console.log(
      `Test file: ${testFileName}`,
    );

    console.log(
      `File path: ${filePath}`,
    );

    // -----------------------------------------
    // Step 1: Login
    // -----------------------------------------

    await loginPage.open();

    await loginPage.login(
      testConfig.testEmail,
      testConfig.testPassword,
    );

    console.log(
      'Login: PASS',
    );

    // -----------------------------------------
    // Step 2: Verify Vault
    // -----------------------------------------

    await vaultPage.verifyVaultLoaded();

    console.log(
      'Vault: PASS',
    );

    // -----------------------------------------
    // Step 3: Capture Vault baseline
    // -----------------------------------------

    const initialVaultCount =
      await vaultPage.getDocumentCount();

    console.log(
      `Initial Vault documents: ${initialVaultCount}`,
    );

    // -----------------------------------------
    // Step 4: Check whether Image document exists
    // -----------------------------------------

    let matchCount =
      await vaultPage.getDocumentMatchCount(
        testFileName,
      );

    console.log(
      `Image document matches before setup: ${matchCount}`,
    );

    // -----------------------------------------
    // Step 5: Upload only when absent
    // -----------------------------------------

    if (matchCount === 0) {
      console.log(
        'Image document not found — uploading fixture...',
      );

      await vaultPage.uploadTestDocument(
        filePath,
      );

      testDocumentCreated = true;

      console.log(
        'Image upload: PASS',
      );

      await vaultPage.verifyDocumentPresent(
        testFileName,
      );

      await page.waitForTimeout(1000);

      matchCount =
        await vaultPage.getDocumentMatchCount(
          testFileName,
        );

      console.log(
        `Image document matches after upload: ${matchCount}`,
      );
    } else {
      console.log(
        'Image document already exists — upload skipped.',
      );
    }

    // -----------------------------------------
    // Step 6: Verify exactly one Image document
    // -----------------------------------------

    expect(
      matchCount,
      `Expected exactly one copy of ${testFileName}, found ${matchCount}`,
    ).toBe(1);

    console.log(
      'Exactly one Image document exists: PASS',
    );

    // -----------------------------------------
    // Step 7: Verify upload/setup result
    // -----------------------------------------

    const afterUploadCount =
      await vaultPage.getDocumentCount();

    console.log(
      `Documents after setup: ${afterUploadCount}`,
    );

    if (testDocumentCreated) {
      expect(
        afterUploadCount,
        'Document count did not increase by exactly one after Image upload',
      ).toBe(
        initialVaultCount + 1,
      );

      console.log(
        `Upload count: ${initialVaultCount} → ${afterUploadCount} — PASS`,
      );
    } else {
      expect(
        afterUploadCount,
        'Existing Vault document count changed unexpectedly',
      ).toBe(
        initialVaultCount,
      );

      console.log(
        `Existing document count preserved: ${initialVaultCount} → ${afterUploadCount} — PASS`,
      );
    }

    // -----------------------------------------
    // Step 8: Download Image
    // -----------------------------------------

    const document =
      page.getByText(
        testFileName,
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

    const downloadPromise =
      page.waitForEvent(
        'download',
      );

    await downloadMenuItem.click();

    const download =
      await downloadPromise;

    console.log(
      'Download operation: PASS',
    );

    console.log(
      `Suggested filename: ${download.suggestedFilename()}`,
    );

    expect(
      download.suggestedFilename(),
    ).toBe(
      testFileName,
    );

    console.log(
      'Downloaded filename: PASS',
    );

    // -----------------------------------------
    // Step 9: Cleanup only if this test uploaded
    // -----------------------------------------

    if (testDocumentCreated) {
      await vaultPage.deleteTestDocument(
        testFileName,
      );

      console.log(
        `Image deletion: ${testFileName} — PASS`,
      );

      await page.waitForTimeout(1000);

      const afterCleanupMatchCount =
        await vaultPage.getDocumentMatchCount(
          testFileName,
        );

      console.log(
        `Image document matches after cleanup: ${afterCleanupMatchCount}`,
      );

      expect(
        afterCleanupMatchCount,
        `${testFileName} still exists after cleanup`,
      ).toBe(0);

      const finalVaultCount =
        await vaultPage.getDocumentCount();

      console.log(
        `Documents after cleanup: ${finalVaultCount}`,
      );

      expect(
        finalVaultCount,
        'Unrelated Vault documents were changed',
      ).toBe(
        initialVaultCount,
      );

      console.log(
        `Cleanup count: ${afterUploadCount} → ${finalVaultCount} — PASS`,
      );

      console.log(
        'Unrelated Vault documents preserved: PASS',
      );
    } else {
      console.log(
        'Existing Image document preserved: PASS',
      );
    }

    // -----------------------------------------
    // Final status
    // -----------------------------------------

    console.log(
      '----------------------------------------',
    );

    console.log(
      'IMAGE TEST: HEALTHY',
    );

    console.log(
      '----------------------------------------',
    );
  },
);
