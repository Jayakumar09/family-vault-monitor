import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';
import fs from 'fs/promises';
import path from 'path';

type FileStatus =
  | 'DETECTED'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'ALREADY_EXISTS'
  | 'FAILED'
  | 'MISSING_FROM_VAULT';

type FileState = {
  size: number;
  modifiedTimeMs: number;
  sha256: string;
  status: FileStatus;
  detectedAt: string;
  uploadedAt?: string;
};

type UploadState = Record<string, FileState>;

test('Upload one controlled ToUpload document', async ({
  page,
}) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  const testFileName =
    'Passport (front).pdf';

  const toUploadDirectory =
    path.resolve(
      process.cwd(),
      'ToUpload',
    );

  const statusFilePath =
    path.resolve(
      process.cwd(),
      'UploadStatus',
      'toupload-state.json',
    );

  const testFilePath =
    path.join(
      toUploadDirectory,
      testFileName,
    );

  console.log('========================================');
  console.log('CONTROLLED TOUPLOAD DOCUMENT UPLOAD');
  console.log('========================================');
  console.log(
    `Document: ${testFileName}`,
  );
  console.log(
    `Source: ${testFilePath}`,
  );
  console.log('----------------------------------------');

  // -----------------------------------------
  // Step 1: Verify source file exists
  // -----------------------------------------

  const fileStats =
    await fs.stat(testFilePath);

  expect(
    fileStats.isFile(),
    'ToUpload source is not a file',
  ).toBe(true);

  console.log(
    `Source file size: ${fileStats.size} bytes`,
  );

  // -----------------------------------------
  // Step 2: Load current state
  // -----------------------------------------

  let uploadState: UploadState = {};

  try {
    const stateContent =
      await fs.readFile(
        statusFilePath,
        'utf8',
      );

    uploadState =
      JSON.parse(
        stateContent,
      ) as UploadState;
  } catch {
    uploadState = {};
  }

  const previousState =
    uploadState[testFileName];

  console.log(
    `Previous local status: ${
      previousState?.status ?? 'NONE'
    }`,
  );

  // -----------------------------------------
  // Step 3: Login
  // -----------------------------------------

  await loginPage.open();

  await loginPage.login(
    testConfig.testEmail,
    testConfig.testPassword,
  );

  console.log('Login: PASS');

  // -----------------------------------------
  // Step 4: Verify Vault
  // -----------------------------------------

  await vaultPage.verifyVaultLoaded();

  console.log('Vault: PASS');

  // -----------------------------------------
  // Step 5: Check whether document exists
  // -----------------------------------------

  const document =
    page.getByText(
      testFileName,
      {
        exact: true,
      },
    );

  const existingCount =
    await document.count();

  console.log(
    `Current Vault filename matches: ${existingCount}`,
  );

  // -----------------------------------------
  // Step 6: Do not duplicate an existing file
  // -----------------------------------------

  if (existingCount > 0) {
    console.log(
      `Document already exists in Vault: ${testFileName}`,
    );

    uploadState[testFileName] = {
      ...(previousState ?? {
        size: fileStats.size,
        modifiedTimeMs: fileStats.mtimeMs,
        sha256: '',
        detectedAt:
          new Date().toISOString(),
      }),
      status: 'ALREADY_EXISTS',
    };

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
      'Local status updated: ALREADY_EXISTS',
    );

    console.log('----------------------------------------');
    console.log(
      'CONTROLLED UPLOAD: SKIPPED',
    );
    console.log('========================================');

    return;
  }

  // -----------------------------------------
  // Step 7: Mark document as uploading
  // -----------------------------------------

  uploadState[testFileName] = {
    ...(previousState ?? {
      size: fileStats.size,
      modifiedTimeMs: fileStats.mtimeMs,
      sha256: '',
      detectedAt:
        new Date().toISOString(),
    }),
    status: 'UPLOADING',
  };

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
    'Local status: UPLOADING',
  );

  // -----------------------------------------
  // Step 8: Upload document
  // -----------------------------------------

  try {
    await vaultPage.uploadTestDocument(
      testFilePath,
    );

    console.log(
      'Upload operation: PASS',
    );

    // -----------------------------------------
    // Step 9: Verify document
    // -----------------------------------------

    await vaultPage.verifyDocumentPresent(
      testFileName,
    );

    console.log(
      `Document visible in Vault: ${testFileName} — PASS`,
    );

    // -----------------------------------------
    // Step 10: Record successful upload
    // -----------------------------------------

    uploadState[testFileName] = {
      ...(uploadState[testFileName] ?? {
        size: fileStats.size,
        modifiedTimeMs: fileStats.mtimeMs,
        sha256: '',
        detectedAt:
          new Date().toISOString(),
      }),
      status: 'UPLOADED',
      uploadedAt:
        new Date().toISOString(),
    };

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
      'Local status: UPLOADED',
    );

    console.log('----------------------------------------');
    console.log(
      'CONTROLLED UPLOAD: HEALTHY',
    );
    console.log('========================================');
  } catch (error) {
    // -----------------------------------------
    // Step 11: Record failed upload
    // -----------------------------------------

    uploadState[testFileName] = {
      ...(uploadState[testFileName] ?? {
        size: fileStats.size,
        modifiedTimeMs: fileStats.mtimeMs,
        sha256: '',
        detectedAt:
          new Date().toISOString(),
      }),
      status: 'FAILED',
    };

    await fs.writeFile(
      statusFilePath,
      JSON.stringify(
        uploadState,
        null,
        2,
      ),
      'utf8',
    );

    console.error(
      'Upload operation: FAILED',
    );

    throw error;
  }
});