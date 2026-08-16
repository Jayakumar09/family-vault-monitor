import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

test(
  'Restore controlled missing-from-Vault test document',
  async ({ page }) => {
    const loginPage =
      new LoginPage(page);

    const vaultPage =
      new VaultPage(page);

    const testFileName =
      'FamilyVault_Monitor_Test_01.txt';

    const testFilePath =
      path.resolve(
        process.cwd(),
        'ToUpload',
        testFileName,
      );

    const stateFilePath =
      path.resolve(
        process.cwd(),
        'UploadStatus',
        'toupload-state.json',
      );

    console.log(
      '========================================',
    );

    console.log(
      'RESTORE CONTROLLED TEST DOCUMENT',
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
    // Step 1: Verify local test file
    // -----------------------------------------

    const fileStats =
      await fs.stat(
        testFilePath,
      );

    expect(
      fileStats.isFile(),
      'Controlled test file does not exist.',
    ).toBe(true);

    console.log(
      `Local test file: PASS (${fileStats.size} bytes)`,
    );

    // -----------------------------------------
    // Step 2: Read current state
    // -----------------------------------------

    const rawState =
      await fs.readFile(
        stateFilePath,
        'utf8',
      );

    const state =
      JSON.parse(rawState) as Record<
        string,
        {
          size: number;
          modifiedTimeMs: number;
          sha256: string;
          status: string;
          detectedAt: string;
          uploadedAt?: string;
        }
      >;

    const currentState =
      state[testFileName];

    expect(
      currentState,
      `No state entry exists for ${testFileName}.`,
    ).toBeDefined();

    console.log(
      `Current local status: ${currentState.status}`,
    );

    expect(
      currentState.status,
      `Expected ${testFileName} to be MISSING_FROM_VAULT before restoration.`,
    ).toBe(
      'MISSING_FROM_VAULT',
    );

    // -----------------------------------------
    // Step 3: Calculate real SHA-256
    // -----------------------------------------

    const fileBuffer =
      await fs.readFile(
        testFilePath,
      );

    const sha256 =
      crypto
        .createHash('sha256')
        .update(fileBuffer)
        .digest('hex');

    console.log(
      `SHA-256: ${sha256}`,
    );

    // -----------------------------------------
    // Step 4: Login
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
    // Step 5: Verify Vault
    // -----------------------------------------

    await vaultPage.verifyVaultLoaded();

    console.log(
      'Vault: PASS',
    );

    // -----------------------------------------
    // Step 6: Confirm document is missing
    // -----------------------------------------

    const beforeRestoreCount =
      await vaultPage.getDocumentMatchCount(
        testFileName,
      );

    console.log(
      `Vault matches before restore: ${beforeRestoreCount}`,
    );

    expect(
      beforeRestoreCount,
      'Controlled test document unexpectedly exists before restoration.',
    ).toBe(0);

    // -----------------------------------------
    // Step 7: Explicit controlled restoration
    // -----------------------------------------

    await vaultPage.uploadTestDocument(
      testFilePath,
    );

    console.log(
      'Controlled restoration upload: PASS',
    );

    // -----------------------------------------
    // Step 8: Verify exactly one copy
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
            `Controlled test document "${testFileName}" was not restored.`,
        },
      )
      .toBe(1);

    console.log(
      'Vault matches after restore: 1',
    );

    await vaultPage.verifyDocumentPresent(
      testFileName,
    );

    console.log(
      `Document visible in Vault: ${testFileName} — PASS`,
    );

    // -----------------------------------------
    // Step 9: Update ONLY controlled test state
    // -----------------------------------------

    state[testFileName] = {
      ...currentState,

      size:
        fileStats.size,

      modifiedTimeMs:
        fileStats.mtimeMs,

      sha256,

      status:
        'UPLOADED',

      uploadedAt:
        new Date().toISOString(),
    };

    await fs.writeFile(
      stateFilePath,
      JSON.stringify(
        state,
        null,
        2,
      ) + '\n',
      'utf8',
    );

    console.log(
      'Controlled local state restored: UPLOADED',
    );

    // -----------------------------------------
    // Step 10: Verify persisted state
    // -----------------------------------------

    const verifyRawState =
      await fs.readFile(
        stateFilePath,
        'utf8',
      );

    const verifyState =
      JSON.parse(
        verifyRawState,
      ) as typeof state;

    expect(
      verifyState[testFileName].status,
    ).toBe(
      'UPLOADED',
    );

    expect(
      verifyState[testFileName].sha256,
    ).toBe(
      sha256,
    );

    expect(
      verifyState[testFileName].size,
    ).toBe(
      fileStats.size,
    );

    console.log(
      'Persisted state verification: PASS',
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      'CONTROLLED DOCUMENT RESTORE: HEALTHY',
    );

    console.log(
      '========================================',
    );
  },
);