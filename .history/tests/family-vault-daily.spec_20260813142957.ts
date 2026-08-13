import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';
import path from 'path';

test.describe('Family Vault Daily Health Check - V3', () => {
  test('Complete login, upload, persistence, and cleanup workflow', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const vaultPage = new VaultPage(page);

    const testFileName = 'FamilyVault_Test_01.txt';
    const testFilePath = path.resolve(
      process.cwd(),
      testFileName,
    );

    let uploadCompleted = false;
    let testError: unknown = null;

    console.log('========================================');
    console.log('FAMILY VAULT DAILY HEALTH CHECK - V2');
    console.log('========================================');
    console.log(`Target: ${testConfig.loginUrl}`);
    console.log(`Test document: ${testFileName}`);
    console.log('----------------------------------------');

    try {
      // -----------------------------------------
      // Step 1: Open login page
      // -----------------------------------------

      await loginPage.open();
      await loginPage.verifyLoginPage();

      console.log('Login page: PASS');

      // -----------------------------------------
      // Step 2: Login #1
      // -----------------------------------------

      const loginTime1 = await loginPage.login(
        testConfig.testEmail,
        testConfig.testPassword,
      );

      console.log('Login #1: PASS');
      console.log(`Login #1 operation time: ${loginTime1} ms`);

      // -----------------------------------------
      // Step 3: Verify Vault #1
      // -----------------------------------------

      await vaultPage.verifyVaultLoaded();

      console.log('Vault #1: PASS');
      console.log(`Authenticated URL: ${page.url()}`);

      // -----------------------------------------
      // Step 4: Record document count
      // -----------------------------------------

      const beforeCount =
        await vaultPage.getDocumentCount();

      console.log(
        `Documents before upload: ${beforeCount}`,
      );

      // -----------------------------------------
      // Step 5: Upload test document
      // -----------------------------------------

      await vaultPage.uploadTestDocument(
        testFilePath,
      );

      uploadCompleted = true;

      console.log('Upload operation: PASS');

      // -----------------------------------------
      // Step 6: Verify uploaded document
      // -----------------------------------------

      await vaultPage.verifyDocumentPresent(
        testFileName,
      );

      console.log(
        `Test document visible: ${testFileName} — PASS`,
      );

      // -----------------------------------------
      // Step 7: Verify document count increased
      // -----------------------------------------

      const afterUploadCount =
        await vaultPage.getDocumentCount();

      console.log(
        `Documents after upload: ${afterUploadCount}`,
      );

      expect(
        afterUploadCount,
        'Document count did not increase by exactly one',
      ).toBe(beforeCount + 1);

      console.log(
        `Upload count comparison: ${beforeCount} → ${afterUploadCount} — PASS`,
      );

      // -----------------------------------------
      // Step 8: Logout
      // -----------------------------------------

      const logoutTime =
        await vaultPage.logout();

      console.log('Logout: PASS');
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
      // Step 10: Login #2
      // -----------------------------------------

      const loginTime2 =
        await loginPage.login(
          testConfig.testEmail,
          testConfig.testPassword,
        );

      console.log('Login #2: PASS');
      console.log(
        `Login #2 operation time: ${loginTime2} ms`,
      );

      // -----------------------------------------
      // Step 11: Verify Vault #2
      // -----------------------------------------

      await vaultPage.verifyVaultLoaded();

      console.log('Vault #2: PASS');

      // -----------------------------------------
      // Step 12: Verify document persistence
      // -----------------------------------------

      const persistedCount =
        await vaultPage.getDocumentCount();

      console.log(
        `Documents after re-login: ${persistedCount}`,
      );

      await vaultPage.verifyDocumentPresent(
        testFileName,
      );

      console.log(
        `Test document after re-login: ${testFileName} — PASS`,
      );

      expect(
        persistedCount,
        'Document count changed after logout/login',
      ).toBe(afterUploadCount);

      console.log(
        `Persistence comparison: ${afterUploadCount} → ${persistedCount} — PASS`,
      );

      // -----------------------------------------
      // Step 13: Cleanup
      // -----------------------------------------

      await vaultPage.deleteTestDocument(
        testFileName,
      );

      uploadCompleted = false;

      console.log('Cleanup operation: PASS');

      // -----------------------------------------
      // Step 14: Verify cleanup
      // -----------------------------------------

      const finalCount =
        await vaultPage.getDocumentCount();

      console.log(
        `Documents after cleanup: ${finalCount}`,
      );

      expect(
        finalCount,
        'Document count did not return to the pre-test count',
      ).toBe(beforeCount);

      console.log(
        `Cleanup count comparison: ${persistedCount} → ${finalCount} — PASS`,
      );

      await expect(
        page.getByText(testFileName, {
          exact: true,
        }),
      ).not.toBeVisible();

      console.log(
        `Test document removed: ${testFileName} — PASS`,
      );

      console.log('----------------------------------------');
      console.log('OVERALL V2 STATUS: HEALTHY');
      console.log('----------------------------------------');
    } catch (error) {
      testError = error;

      console.error('----------------------------------------');
      console.error('V2 HEALTH CHECK FAILED');
      console.error(error);
      console.error('----------------------------------------');

      throw error;
    } finally {
      // -----------------------------------------
      // Failure-safe cleanup
      // -----------------------------------------

      if (uploadCompleted) {
        try {
          console.log(
            'Failure-safe cleanup: attempting to remove test document...',
          );

          // The document may still be visible if the failure
          // occurred before logout. If the page is still
          // authenticated, attempt cleanup.
          if (!page.url().endsWith('/login')) {
            await vaultPage.deleteTestDocument(
              testFileName,
            );

            console.log(
              'Failure-safe cleanup: PASS',
            );
          } else {
            console.log(
              'Failure-safe cleanup: skipped because session is logged out',
            );
          }
        } catch (cleanupError) {
          console.error(
            'Failure-safe cleanup: FAILED',
          );

          console.error(cleanupError);

          // Preserve the original test failure.
          if (!testError) {
            throw cleanupError;
          }
        }
      }
    }
  });
});