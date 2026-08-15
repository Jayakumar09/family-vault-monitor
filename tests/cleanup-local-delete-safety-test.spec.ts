import {
  test,
  expect,
} from '@playwright/test';

import fs from 'fs/promises';
import path from 'path';

import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test(
  'Cleanup LOCAL_DELETE_TEST safely',
  async ({ page }) => {
    const loginPage =
      new LoginPage(page);

    const vaultPage =
      new VaultPage(page);

    const testFileName =
      'LOCAL_DELETE_TEST.txt';

    const statusFilePath =
      path.resolve(
        process.cwd(),
        'UploadStatus',
        'toupload-state.json',
      );

    console.log(
      '========================================',
    );

    console.log(
      'LOCAL DELETE SAFETY TEST CLEANUP',
    );

    console.log(
      '========================================',
    );

    console.log(
      `Document: ${testFileName}`,
    );

    // -----------------------------------------
    // Step 1: Login
    // -----------------------------------------

    await loginPage.open();

    await loginPage.login(
      testConfig.testEmail,
      testConfig.testPassword,
    );

    console.log('Login: PASS');

    // -----------------------------------------
    // Step 2: Verify Vault
    // -----------------------------------------

    await vaultPage.verifyVaultLoaded();

    console.log('Vault: PASS');

    // -----------------------------------------
    // Step 3: Verify exactly one copy exists
    // -----------------------------------------

    const beforeCount =
      await vaultPage.getDocumentMatchCount(
        testFileName,
      );

    console.log(
      `Vault matches before cleanup: ${beforeCount}`,
    );

    expect(
      beforeCount,
      'Expected exactly one safety-test document',
    ).toBe(1);

    // -----------------------------------------
    // Step 4: Delete only the test document
    // -----------------------------------------

    await vaultPage.deleteTestDocument(
      testFileName,
    );

    console.log(
      'Test document delete: PASS',
    );

    // -----------------------------------------
    // Step 5: Verify it was removed
    // -----------------------------------------

    await page.waitForTimeout(1000);

    const afterCount =
      await vaultPage.getDocumentMatchCount(
        testFileName,
      );

    console.log(
      `Vault matches after cleanup: ${afterCount}`,
    );

    expect(
      afterCount,
      'Safety-test document still exists',
    ).toBe(0);

    // -----------------------------------------
    // Step 6: Remove only its local monitor state
    // -----------------------------------------

    const rawState =
      await fs.readFile(
        statusFilePath,
        'utf8',
      );

    const uploadState =
      JSON.parse(
        rawState,
      ) as Record<string, unknown>;

    delete uploadState[testFileName];

    await fs.writeFile(
      statusFilePath,
      JSON.stringify(
        uploadState,
        null,
        2,
      ),
      'utf8',
    );

    console.log(
      'Local monitor state cleanup: PASS',
    );

    // -----------------------------------------
    // Final status
    // -----------------------------------------

    console.log(
      '----------------------------------------',
    );

    console.log(
      'SAFETY TEST CLEANUP: PASS',
    );

    console.log(
      'LOCAL_DELETE_TEST.txt removed from Vault.',
    );

    console.log(
      'Test state removed from local monitor.',
    );

    console.log(
      '========================================',
    );
  },
);