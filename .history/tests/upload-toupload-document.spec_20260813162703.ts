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

test('Process one controlled ToUpload document safely', async ({
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
  console.log('SAFE TOUPLOAD DOCUMENT PROCESSING');
  console.log('========================================');
  console.log(
    `Document: ${testFileName}`,
  );
  console.log(
    `Source: ${testFilePath}`,
  );
  console.log('----------------------------------------');

  // -----------------------------------------
  // Step 1: Verify source file
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
  // Step 2: Load local state
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
  // Step 5: Wait for Vault document data
  // -----------------------------------------

  await page.getByText(
    /documents?\s+secured/i,
  ).first().waitFor({
    state: 'visible',
    timeout: 15000,
  });

  // Allow the document list to finish rendering.
  await page.waitForTimeout(1000);

  // -----------------------------------------
  // Step 6: Count exact filename matches
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
  // Step 7: Previously uploaded document
  // -----------------------------------------

  if (
    previousState?.status ===
    'UPLOADED'
  ) {
    // ---------------------------------------
    // Previously uploaded + currently exists
    // ---------------------------------------

    if (existingCount === 1) {
      uploadState[testFileName] = {
        ...previousState,
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
        `Document already exists in Vault: ${testFileName}`,
      );

      console.log(
        'Local status updated: ALREADY_EXISTS',
      );

      console.log('----------------------------------------');
      console.log(
        'SAFE PROCESSING: SKIPPED DUPLICATE',
      );
      console.log('========================================');

      return;
    }

    // ---------------------------------------
    // Previously uploaded + duplicate copies
    // ---------------------------------------

    if (existingCount > 1) {
      console.error(
        `DUPLICATE DETECTED: ${existingCount} copies of ${testFileName}`,
      );

      throw new Error(
        `Duplicate Vault documents detected for "${testFileName}". Upload blocked.`,
      );
    }

    // ---------------------------------------
    // Previously uploaded + currently missing
    // ---------------------------------------

    uploadState[testFileName] = {
      ...previousState,
      status: 'MISSING_FROM_VAULT',
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
      `Previously uploaded document is not currently in Vault: ${testFileName}`,
    );

    console.log(
      'Local status updated: MISSING_FROM_VAULT',
    );

    console.log(
      'Automatic re-upload: BLOCKED',
    );

    console.log('----------------------------------------');
    console.log(
      'MISSING-FROM-VAULT SAFETY CHECK: PASS',
    );
    console.log('========================================');

    return;
  }

  // -----------------------------------------
  // Step 8: Existing Vault document
  // -----------------------------------------

  if (existingCount > 0) {
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
      `Document already exists in Vault: ${testFileName}`,
    );

    console.log(
      'Local status updated: ALREADY_EXISTS',
    );

    console.log('----------------------------------------');
    console.log(
      'SAFE PROCESSING: SKIPPED',
    );
    console.log('========================================');

    return;
  }

  // -----------------------------------------
  // Step 9: New document
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
  // Step 10: Upload
  // -----------------------------------------

  try {
    await vaultPage.uploadTestDocument(
      testFilePath,
    );

    console.log(
      'Upload operation: PASS',
    );

    // ---------------------------------------
    // Step 11: Verify upload
    // ---------------------------------------

    await vaultPage.verifyDocumentPresent(
      testFileName,
    );

    console.log(
      `Document visible in Vault: ${testFileName} — PASS`,
    );

    // ---------------------------------------
    // Step 12: Record successful upload
    // ---------------------------------------

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