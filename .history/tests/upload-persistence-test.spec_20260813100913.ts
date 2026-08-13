import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test.describe('Family Vault Upload Persistence - V1.4', () => {
  test('Verify uploaded test document survives logout and login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const vaultPage = new VaultPage(page);

    const testFileName = 'FamilyVault_Test_01.txt';

    console.log('========================================');
    console.log('Family Vault Upload Persistence - V1.4');
    console.log('========================================');

    // -----------------------------------------
    // Step 1: Login
    // -----------------------------------------

    await loginPage.open();

    await loginPage.login(
      testConfig.testEmail,
      testConfig.testPassword,
    );

    console.log('Login #1: PASS');

    // -----------------------------------------
    // Step 2: Verify Vault
    // -----------------------------------------

    await vaultPage.verifyVaultLoaded();

    console.log('Vault #1: PASS');

    // -----------------------------------------
    // Step 3: Record document count
    // -----------------------------------------

    const documentCount1 = await vaultPage.getDocumentCount();

    console.log(`Document count #1: ${documentCount1}`);

    // -----------------------------------------
    // Step 4: Verify test document exists
    // -----------------------------------------

    await vaultPage.verifyDocumentPresent(testFileName);

    console.log(
      `Test document before logout: ${testFileName} — PASS`,
    );

    // -----------------------------------------
    // Step 5: Logout
    // -----------------------------------------

    const logoutTime = await vaultPage.logout();

    console.log('Logout: PASS');
    console.log(`Logout operation time: ${logoutTime} ms`);

    // -----------------------------------------
    // Step 6: Verify login page
    // -----------------------------------------

    await loginPage.verifyLoginPage();

    console.log('Login page after logout: PASS');

    // -----------------------------------------
    // Step 7: Login again
    // -----------------------------------------

    const loginTime2 = await loginPage.login(
      testConfig.testEmail,
      testConfig.testPassword,
    );

    console.log('Login #2: PASS');
    console.log(`Login #2 operation time: ${loginTime2} ms`);

    // -----------------------------------------
    // Step 8: Verify Vault again
    // -----------------------------------------

    await vaultPage.verifyVaultLoaded();

    console.log('Vault #2: PASS');

    // -----------------------------------------
    // Step 9: Get document count again
    // -----------------------------------------

    const documentCount2 = await vaultPage.getDocumentCount();

    console.log(`Document count #2: ${documentCount2}`);

    // -----------------------------------------
    // Step 10: Verify test document persists
    // -----------------------------------------

    await vaultPage.verifyDocumentPresent(testFileName);

    console.log(
      `Test document after login: ${testFileName} — PASS`,
    );

    // -----------------------------------------
    // Step 11: Compare document counts
    // -----------------------------------------

    expect(
      documentCount2,
      'Document count changed after logout and login',
    ).toBe(documentCount1);

    console.log(
      `Document persistence: ${documentCount1} → ${documentCount2} — PASS`,
    );

    // -----------------------------------------
    // Final status
    // -----------------------------------------

    console.log('----------------------------------------');
    console.log('Upload persistence: PASS');
    console.log('Overall V1.4 status: HEALTHY');
    console.log('----------------------------------------');
  });
});