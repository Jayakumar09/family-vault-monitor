import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test(
  'Prepare controlled document for missing-from-Vault safety test',
  async ({ page }) => {
    const loginPage =
      new LoginPage(page);

    const vaultPage =
      new VaultPage(page);

    const testFileName =
      'FamilyVault_Monitor_Test_01.txt';

    console.log(
      '========================================',
    );

    console.log(
      'PREPARE MISSING-FROM-VAULT SAFETY TEST',
    );

    console.log(
      '========================================',
    );

    console.log(
      `Document: ${testFileName}`,
    );

    console.log(
      '----------------------------------------',
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
    // Step 3: Confirm controlled document exists
    // -----------------------------------------

    const initialMatchCount =
      await vaultPage.getDocumentMatchCount(
        testFileName,
      );

    console.log(
      `Initial Vault matches: ${initialMatchCount}`,
    );

    expect(
      initialMatchCount,
      `Expected exactly one controlled test document "${testFileName}" before deletion.`,
    ).toBe(1);

    // -----------------------------------------
    // Step 4: Delete ONLY controlled document
    // -----------------------------------------

    await vaultPage.deleteTestDocument(
      testFileName,
    );

    console.log(
      'Controlled document deletion: PASS',
    );

    // -----------------------------------------
    // Step 5: Verify document is really gone
    // -----------------------------------------

    await expect
      .poll(
        async () =>
          await vaultPage.getDocumentMatchCount(
            testFileName,
          ),
        {
          timeout: 30000,
          message:
            `Controlled test document "${testFileName}" was not removed from the Vault.`,
        },
      )
      .toBe(0);

    console.log(
      'Vault match after deletion: 0',
    );

    // -----------------------------------------
    // Step 6: Confirm local source remains
    // -----------------------------------------

    console.log(
      'Local ToUpload source intentionally preserved.',
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      'MISSING-FROM-VAULT TEST PREPARATION: PASS',
    );

    console.log(
      '========================================',
    );
  },
);