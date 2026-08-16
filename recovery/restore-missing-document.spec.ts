import {
  test,
  expect,
} from '@playwright/test';

import fs from 'fs/promises';
import crypto from 'crypto';

import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';
import { recoveryConfig } from './config/recovery-config';

type RecoveryFileState = {
  size: number;
  modifiedTimeMs: number;
  sha256: string;
  status: string;
  detectedAt: string;
  uploadedAt?: string;
};

type RecoveryState =
  Record<string, RecoveryFileState>;

test(
  'Explicitly restore one MISSING_FROM_VAULT document',
  async ({ page }) => {
    const loginPage =
      new LoginPage(page);

    const vaultPage =
      new VaultPage(page);

    const {
      fileName,
      filePath,
      stateFilePath,
    } = recoveryConfig;

    console.log(
      '========================================',
    );

    console.log(
      'EXPLICIT MISSING-FROM-VAULT RECOVERY',
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
    // Step 1: Verify local recovery file
    // -----------------------------------------

    const fileStats =
      await fs.stat(filePath);

    expect(
      fileStats.isFile(),
      'Recovery source is not a file.',
    ).toBe(true);

    console.log(
      `Local file: PASS (${fileStats.size} bytes)`,
    );

    // -----------------------------------------
    // Step 2: Read persistent state
    // -----------------------------------------

    const rawState =
      await fs.readFile(
        stateFilePath,
        'utf8',
      );

    const state =
      JSON.parse(
        rawState,
      ) as RecoveryState;

    const currentState =
      state[fileName];

    expect(
      currentState,
      `No local state exists for "${fileName}".`,
    ).toBeDefined();

    console.log(
      `Current local status: ${currentState.status}`,
    );

    // -----------------------------------------
    // Step 3: Recovery is allowed ONLY for
    // MISSING_FROM_VAULT
    // -----------------------------------------

    expect(
      currentState.status,
      `Recovery blocked. "${fileName}" must have status MISSING_FROM_VAULT.`,
    ).toBe(
      'MISSING_FROM_VAULT',
    );

    // -----------------------------------------
    // Step 4: Calculate actual SHA-256
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
    // Step 5: Login
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
    // Step 6: Verify Family Vault
    // -----------------------------------------

    await vaultPage.verifyVaultLoaded();

    console.log(
      'Vault: PASS',
    );

    // -----------------------------------------
    // Step 7: Confirm ZERO Vault copies
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
      `Recovery blocked. "${fileName}" already exists in Family Vault.`,
    ).toBe(0);

    // -----------------------------------------
    // Step 8: Explicit restoration upload
    // -----------------------------------------

    await vaultPage.uploadTestDocument(
      filePath,
    );

    console.log(
      'Explicit recovery upload: PASS',
    );

    // -----------------------------------------
    // Step 9: Verify exactly ONE copy
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
            `Recovery document "${fileName}" was not restored.`,
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
    // Step 10: Update ONLY recovered document
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
      'Local state restored: UPLOADED',
    );

    // -----------------------------------------
    // Step 11: Verify persisted state
    // -----------------------------------------

    const verifyRawState =
      await fs.readFile(
        stateFilePath,
        'utf8',
      );

    const verifyState =
      JSON.parse(
        verifyRawState,
      ) as RecoveryState;

    expect(
      verifyState[fileName],
    ).toBeDefined();

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

    console.log(
      'Persisted state verification: PASS',
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      'EXPLICIT DOCUMENT RECOVERY: HEALTHY',
    );

    console.log(
      '========================================',
    );
  },
);