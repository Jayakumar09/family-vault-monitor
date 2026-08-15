import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';
import path from 'path';

test.describe('Family Vault Upload Persistence - V1.4', () => {
  test(
    'Verify uploaded test document survives logout and login',
    async ({ page }) => {
      const loginPage =
        new LoginPage(page);

      const vaultPage =
        new VaultPage(page);

      const testFileName =
        'FamilyVault_Test_01.txt';

      const testFilePath =
        path.resolve(
          process.cwd(),
          testFileName,
        );

      let testDocumentCreated =
        false;

      let initialVaultCount = 0;

      console.log(
        '========================================',
      );

      console.log(
        'Family Vault Upload Persistence - V1.4',
      );

      console.log(
        '========================================',
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
        'Login #1: PASS',
      );

      // -----------------------------------------
      // Step 2: Verify Vault
      // -----------------------------------------

      await vaultPage.verifyVaultLoaded();

      console.log(
        'Vault #1: PASS',
      );

      // -----------------------------------------
      // Step 3: Capture initial Vault baseline
      // -----------------------------------------

      initialVaultCount =
        await vaultPage.getDocumentCount();

      console.log(
        `Initial Vault documents: ${initialVaultCount}`,
      );

      // -----------------------------------------
      // Step 4: Check test document
      // -----------------------------------------

      let matchCount =
        await vaultPage.getDocumentMatchCount(
          testFileName,
        );

      console.log(
        `Test document matches before setup: ${matchCount}`,
      );

      // -----------------------------------------
      // Step 5: Create test document if absent
      // -----------------------------------------

      if (matchCount === 0) {
        console.log(
          'Test document not found — uploading fixture...',
        );

        await vaultPage.uploadTestDocument(
          testFilePath,
        );

        testDocumentCreated = true;

        console.log(
          'Test document upload: PASS',
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
          `Test document matches after setup: ${matchCount}`,
        );
      }

      // -----------------------------------------
      // Step 6: Require exactly one copy
      // -----------------------------------------

      expect(
        matchCount,
        `Expected exactly one copy of ${testFileName}, found ${matchCount}`,
      ).toBe(1);

      console.log(
        'Exactly one test document exists: PASS',
      );

      // -----------------------------------------
      // Step 7: Record persistence baseline
      // -----------------------------------------

      const documentCount1 =
        await vaultPage.getDocumentCount();

      console.log(
        `Document count #1: ${documentCount1}`,
      );

      // -----------------------------------------
      // Step 8: Logout
      // -----------------------------------------

      const logoutTime =
        await vaultPage.logout();

      console.log(
        'Logout: PASS',
      );

      console.log(
        `Logout operation time: ${logoutTime} ms`,
      );

      // -----------------------------------------
      // Step 9: Verify login page
      // -----------------------------------------

      await loginPage.verifyLoginPage();

      console.log(
        'Login page after logout: PASS',
      );

      // -----------------------------------------
      // Step 10: Login again
      // -----------------------------------------

      const loginTime2 =
        await loginPage.login(
          testConfig.testEmail,
          testConfig.testPassword,
        );

      console.log(
        'Login #2: PASS',
      );

      console.log(
        `Login #2 operation time: ${loginTime2} ms`,
      );

      // -----------------------------------------
      // Step 11: Verify Vault again
      // -----------------------------------------

      await vaultPage.verifyVaultLoaded();

      console.log(
        'Vault #2: PASS',
      );

      // -----------------------------------------
      // Step 12: Get document count again
      // -----------------------------------------

      const documentCount2 =
        await vaultPage.getDocumentCount();

      console.log(
        `Document count #2: ${documentCount2}`,
      );

      // -----------------------------------------
      // Step 13: Verify test document persists
      // -----------------------------------------

      await vaultPage.verifyDocumentPresent(
        testFileName,
      );

      console.log(
        `Test document after login: ${testFileName} — PASS`,
      );

      // -----------------------------------------
      // Step 14: Compare document counts
      // -----------------------------------------

      expect(
        documentCount2,
        'Document count changed after logout and login',
      ).toBe(
        documentCount1,
      );

      console.log(
        `Document persistence: ${documentCount1} → ${documentCount2} — PASS`,
      );

      // -----------------------------------------
      // Step 15: Cleanup only test-owned document
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

        expect(
          afterCleanupMatchCount,
          `${testFileName} still exists after cleanup`,
        ).toBe(0);

        const finalVaultCount =
          await vaultPage.getDocumentCount();

        console.log(
          `Initial Vault count: ${initialVaultCount}`,
        );

        console.log(
          `Final Vault count: ${finalVaultCount}`,
        );

        expect(
          finalVaultCount,
          'Unrelated Vault documents were changed',
        ).toBe(
          initialVaultCount,
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
        'Upload persistence: PASS',
      );

      console.log(
        'Overall V1.4 status: HEALTHY',
      );

      console.log(
        '----------------------------------------',
      );
    },
  );
});
