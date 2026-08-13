import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test.describe('Family Vault Health Check - V1.2', () => {
  test('Login, document count, logout, and login again', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const vaultPage = new VaultPage(page);

    console.log('========================================');
    console.log('Family Vault Health Check - V1.2');
    console.log('========================================');

    console.log(`Target: ${testConfig.loginUrl}`);

    // -----------------------------------------
    // Step 1: Open login page
    // -----------------------------------------

    await loginPage.open();

    await loginPage.verifyLoginPage();

    console.log('Login page: PASS');

    // -----------------------------------------
    // Step 2: Verify credentials
    // -----------------------------------------

    expect(
      testConfig.testEmail,
      'FAMILY_VAULT_TEST_EMAIL is not configured',
    ).not.toBe('');

    expect(
      testConfig.testPassword,
      'FAMILY_VAULT_TEST_PASSWORD is not configured',
    ).not.toBe('');

    // -----------------------------------------
    // Step 3: Login #1
    // -----------------------------------------

    const loginTime1 = await loginPage.login(
      testConfig.testEmail,
      testConfig.testPassword,
    );

    console.log('Login #1: PASS');
    console.log(`Login #1 operation time: ${loginTime1} ms`);

    // -----------------------------------------
    // Step 4: Verify Vault #1
    // -----------------------------------------

    await vaultPage.verifyVaultLoaded();

    console.log(`Authenticated URL: ${page.url()}`);
    console.log('Vault #1 loading: PASS');

    // -----------------------------------------
    // Step 5: Get document count #1
    // -----------------------------------------

    const documentCount1 = await vaultPage.getDocumentCount();

    console.log(`Document count #1: ${documentCount1}`);

    // -----------------------------------------
    // Step 6: Logout
    // -----------------------------------------

    const logoutTime = await vaultPage.logout();

    console.log('Logout: PASS');
    console.log(`Logout operation time: ${logoutTime} ms`);

    // -----------------------------------------
    // Step 7: Verify login page after logout
    // -----------------------------------------

    await loginPage.verifyLoginPage();

    console.log('Login page after logout: PASS');

    // -----------------------------------------
    // Step 8: Login #2
    // -----------------------------------------

    const loginTime2 = await loginPage.login(
      testConfig.testEmail,
      testConfig.testPassword,
    );

    console.log('Login #2: PASS');
    console.log(`Login #2 operation time: ${loginTime2} ms`);

    // -----------------------------------------
    // Step 9: Verify Vault #2
    // -----------------------------------------

    await vaultPage.verifyVaultLoaded();

    console.log(`Authenticated URL #2: ${page.url()}`);
    console.log('Vault #2 loading: PASS');

    // -----------------------------------------
    // Step 10: Get document count #2
    // -----------------------------------------

    const documentCount2 = await vaultPage.getDocumentCount();

    console.log(`Document count #2: ${documentCount2}`);

    // -----------------------------------------
    // Step 11: Compare document counts
    // -----------------------------------------

    expect(
      documentCount2,
      'Document count changed after logout and login again',
    ).toBe(documentCount1);

    console.log('Document persistence: PASS');
    console.log(
      `Document count comparison: ${documentCount1} → ${documentCount2}`,
    );

    // -----------------------------------------
    // Step 12: Capture authenticated page
    // -----------------------------------------

    const pageText = await vaultPage.getPageText();

    console.log('----------------------------------------');
    console.log('Authenticated page content preview:');
    console.log(pageText.substring(0, 1000));
    console.log('----------------------------------------');

    // -----------------------------------------
    // Final status
    // -----------------------------------------

    console.log('Overall V1.2 status: HEALTHY');
  });
});