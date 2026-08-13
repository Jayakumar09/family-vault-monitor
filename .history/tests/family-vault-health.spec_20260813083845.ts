import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test.describe('Family Vault Health Check - V1', () => {
  test('Login and Vault availability', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const vaultPage = new VaultPage(page);

    console.log('========================================');
    console.log('Family Vault Health Check');
    console.log('========================================');

    console.log(`Target: ${testConfig.loginUrl}`);

    // -----------------------------------------
    // Step 1: Open login page
    // -----------------------------------------

    await loginPage.open();

    await loginPage.verifyLoginPage();

    console.log('Login page: PASS');

    // -----------------------------------------
    // Step 2: Verify credentials are available
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
    // Step 3: Login
    // -----------------------------------------

    const loginTime = await loginPage.login(
      testConfig.testEmail,
      testConfig.testPassword,
    );

    console.log(`Login: PASS`);
    console.log(`Login operation time: ${loginTime} ms`);

        // -----------------------------------------
    // Step 4: Verify Vault
    // -----------------------------------------

    await vaultPage.verifyVaultLoaded();

    console.log(`Authenticated URL: ${page.url()}`);
    console.log('Vault loading: PASS');

    // -----------------------------------------
    // Step 5: Get document count
    // -----------------------------------------

    const documentCount = await vaultPage.getDocumentCount();

    console.log(`Total documents: ${documentCount}`);

    // -----------------------------------------
    // Step 6: Capture current page information
    // -----------------------------------------

    const pageText = await vaultPage.getPageText();

    console.log('----------------------------------------');
    console.log('Authenticated page content preview:');
    console.log(pageText.substring(0, 1000));
    console.log('----------------------------------------');

    console.log('Overall V1 status: HEALTHY');
  });
});