import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';
import path from 'path';

test(
  'Family Vault - Test document upload',
  async ({ page }) => {
    const loginPage =
      new LoginPage(page);

    const vaultPage =
      new VaultPage(page);

    const testFileName =
      'FamilyVault_Test_01.txt';

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
      'Family Vault Upload Test',
    );

    console.log(
      '========================================',
    );

    console.log(
      `Test document: ${testFileName}`,
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
    // Step 4: Check whether test document exists
    // -----------------------------------------

    let matchCount =
      await vaultPage.getDocumentMatchCount(
        testFileName,
      );

    console.log(
      `Test document matches before setup: ${matchCount}`,
    );

    // -----------------------------------------
    // Step 5: Upload only when absent
    // -----------------------------------------

    if (matchCount === 0) {
      console.log(
        'Test document not found — uploading fixture...',
      );

      await vaultPage.uploadTestDocument(
        filePath,
      );

      testDocumentCreated = true;

      console.log(
        'Upload operation: PASS',
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
        `Test document matches after upload: ${matchCount}`,
      );
    } else {
      console.log(
        'Test document already exists — upload skipped.',
      );
    }

    // -----------------------------------------
    // Step 6: Verify exactly one copy
    // -----------------------------------------

    expect(
      matchCount,
      `Expected exactly one copy of ${testFileName}, found ${matchCount}`,
    ).toBe(1);

    console.log(
      'Exactly one test document exists: PASS',
    );

    // -----------------------------------------
    // Step 7: Verify upload result
    // -----------------------------------------

    const afterUploadCount =
      await vaultPage.getDocumentCount();

    console.log(
      `Documents after setup: ${afterUploadCount}`,
    );

    if (testDocumentCreated) {
      expect(
        afterUploadCount,
        'Document count did not increase by exactly one after upload',
      ).toBe(
        initialVaultCount + 1,
      );

      console.log(
        `Document count comparison: ${initialVaultCount} → ${afterUploadCount} — PASS`,
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
    // Step 8: Cleanup only if this test uploaded it
    // -----------------------------------------

    if (testDocumentCreated) {
      await vaultPage.deleteTestDocument(
        testFileName,
      );

      console.log(
        'Test document cleanup: PASS',
      );

      await page.waitForTimeout(1000);

      const afterCleanupMatchCount =
        await vaultPage.getDocumentMatchCount(
          testFileName,
        );

      console.log(
        `Test document matches after cleanup: ${afterCleanupMatchCount}`,
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
        `Cleanup count comparison: ${afterUploadCount} → ${finalVaultCount} — PASS`,
      );

      console.log(
        'Unrelated Vault documents preserved: PASS',
      );
    } else {
      console.log(
        'Existing test document preserved: PASS',
      );
    }

    // -----------------------------------------
    // Final status
    // -----------------------------------------

    console.log(
      '----------------------------------------',
    );

    console.log(
      'Overall upload test: HEALTHY',
    );

    console.log(
      '----------------------------------------',
    );
  },
);
