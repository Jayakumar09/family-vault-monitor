import {
  test,
  expect,
} from '@playwright/test';

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test(
  'Explicitly restore Passport MISSING_FROM_VAULT document',
  async ({ page }) => {
    const loginPage =
      new LoginPage(page);

    const vaultPage =
      new VaultPage(page);

    const fileName =
      'Passport (front).pdf';

    const filePath =
      path.resolve(
        process.cwd(),
        'ToUpload',
        fileName,
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
      'EXPLICIT PASSPORT RECOVERY',
    );

    console.log(
      '========================================',
    );

    console.log(
      `Document: ${fileName}`,
    );

    console.log(
      `Source: ${filePath}`,
    );

    console.log(
      '----------------------------------------',
    );

    // -----------------------------------------
    // Step 1: Verify local Passport file
    // -----------------------------------------

    const fileStats =
      await fs.stat(
        filePath,
      );

    expect(
      fileStats.isFile(),
      `Local recovery source does not exist: ${filePath}`,
    ).toBe(true);

    console.log(
      `Local file: PASS (${fileStats.size} bytes)`,
    );

    // -----------------------------------------
    // Step 2: Read persistent monitor state
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
      state[fileName];

    expect(
      currentState,
      `No local state entry exists for "${fileName}".`,
    ).toBeDefined();

    console.log(
      `Current local status: ${currentState.status}`,
    );

    expect(
      currentState.status,
      `Recovery blocked. "${fileName}" must have status MISSING_FROM_VAULT.`,
    ).toBe(
      'MISSING_FROM_VAULT',
    );

    // -----------------------------------------
    // Step 3: Calculate current SHA-256
    // -----------------------------------------

    const fileBuffer =
      await fs.readFile(
        filePath,
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
    // Step 5: Verify Family Vault
    // -----------------------------------------

    await vaultPage.verifyVaultLoaded();

    console.log(
      'Vault: PASS',
    );

    // -----------------------------------------
    // Step 6: Confirm Passport is missing
    // -----------------------------------------

    const beforeRestoreCount =
      await vaultPage.getDocumentMatchCount(
        fileName,
      );

    console.log(
      `Vault matches before recovery: ${beforeRestoreCount}`,
    );

    expect(
      beforeRestoreCount,
      `"${fileName}" unexpectedly exists before recovery.`,
    ).toBe(0);

    // -----------------------------------------
    // Step 7: Explicit recovery upload
    // -----------------------------------------

    await vaultPage.uploadTestDocument(
      filePath,
    );

    console.log(
      'Explicit Passport recovery upload: PASS',
    );

    // -----------------------------------------
    // Step 8: Verify exactly one Vault copy
    // -----------------------------------------

    await expect
      .poll(
        async () =>
          await vaultPage.getDocumentMatchCount(
            fileName,
          ),
        {
          timeout: 30000,
          message:
            `"${fileName}" was not restored to Family Vault.`,
        },
      )
      .toBe(1);

    console.log(
      'Vault matches after recovery: 1',
    );

    await vaultPage.verifyDocumentPresent(
      fileName,
    );

    console.log(
      `Document visible in Vault: ${fileName} — PASS`,
    );

    // -----------------------------------------
    // Step 9: Update ONLY Passport state
    // -----------------------------------------

    state[fileName] = {
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
      'Passport local state restored: UPLOADED',
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
      verifyState[fileName].status,
    ).toBe(
      'UPLOADED',
    );

    expect(
      verifyState[fileName].sha256,
    ).toBe(
      sha256,
    );

    expect(
      verifyState[fileName].size,
    ).toBe(
      fileStats.size,
    );

    expect(
      verifyState[fileName].uploadedAt,
    ).toBeTruthy();

    console.log(
      'Persisted Passport state verification: PASS',
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      'PASSPORT DOCUMENT RECOVERY: HEALTHY',
    );

    console.log(
      '========================================',
    );
  },
);