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
  | 'UPLOAD_UNKNOWN'
  | 'MISSING_FROM_VAULT'
  | 'DUPLICATE_DETECTED';

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
  'House ft calculation.xlsx';

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
  // Step 5: Get reliable Vault match count
  // -----------------------------------------

  const existingCount =
    await vaultPage.getDocumentMatchCount(
      testFileName,
    );

  console.log(
    `Current Vault filename matches: ${existingCount}`,
  );

  // -----------------------------------------
  // Step 6: Previously uploaded document
  // -----------------------------------------

  if (
    previousState?.status ===
      'UPLOADED' ||
    previousState?.status ===
      'ALREADY_EXISTS'
  ) {
    // ---------------------------------------
    // Exactly one copy exists
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
        'DUPLICATE UPLOAD PREVENTION: PASS',
      );
      console.log(
        'Upload operation: SKIPPED',
      );
      console.log('========================================');

      return;
    }

    // ---------------------------------------
    // Multiple copies exist
    // ---------------------------------------

    if (existingCount > 1) {
      uploadState[testFileName] = {
        ...previousState,
        status: 'DUPLICATE_DETECTED',
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
        `DUPLICATE DETECTED: ${existingCount} copies`,
      );

      console.error(
        'Automatic upload: BLOCKED',
      );

      throw new Error(
        `Duplicate Vault documents detected for "${testFileName}". Upload blocked.`,
      );
    }

    // ---------------------------------------
    // Previously uploaded but missing
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
    console.log(
      'Upload operation: SKIPPED',
    );
    console.log('========================================');

    return;
  }

  // -----------------------------------------
  // Step 7: Unknown previous upload result
  // -----------------------------------------

  if (
    previousState?.status ===
      'UPLOAD_UNKNOWN' ||
    previousState?.status ===
      'FAILED'
  ) {
    // ---------------------------------------
    // Unknown result + document exists
    // ---------------------------------------

    if (existingCount === 1) {
      uploadState[testFileName] = {
        ...previousState,
        status: 'UPLOADED',
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
        'Previous upload result reconciled successfully.',
      );

      console.log(
        'Vault contains exactly one copy.',
      );

      console.log(
        'Local status updated: UPLOADED',
      );

      console.log('----------------------------------------');
      console.log(
        'UPLOAD RECONCILIATION: PASS',
      );
      console.log(
        'Upload operation: SKIPPED',
      );
      console.log('========================================');

      return;
    }

    // ---------------------------------------
    // Unknown result + duplicates
    // ---------------------------------------

    if (existingCount > 1) {
      uploadState[testFileName] = {
        ...previousState,
        status: 'DUPLICATE_DETECTED',
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

      throw new Error(
        `Upload reconciliation found ${existingCount} Vault copies of "${testFileName}".`,
      );
    }

    // ---------------------------------------
    // Unknown result + no Vault copy
    // ---------------------------------------

    uploadState[testFileName] = {
      ...previousState,
      status: 'UPLOAD_UNKNOWN',
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
      'Previous upload result cannot be safely reconciled.',
    );

    console.log(
      'Vault matches: 0',
    );

    console.log(
      'Local status: UPLOAD_UNKNOWN',
    );

    console.log(
      'Automatic retry: BLOCKED',
    );

    console.log('----------------------------------------');
    console.log(
      'UPLOAD UNKNOWN SAFETY CHECK: PASS',
    );
    console.log('========================================');

    return;
  }

  // -----------------------------------------
  // Step 8: New document already exists
  // -----------------------------------------

  if (existingCount === 1) {
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
      'EXISTING DOCUMENT CHECK: PASS',
    );
    console.log(
      'Upload operation: SKIPPED',
    );
    console.log('========================================');

    return;
  }

  // -----------------------------------------
  // Step 9: Unexpected duplicate condition
  // -----------------------------------------

  if (existingCount > 1) {
    uploadState[testFileName] = {
      ...(previousState ?? {
        size: fileStats.size,
        modifiedTimeMs: fileStats.mtimeMs,
        sha256: '',
        detectedAt:
          new Date().toISOString(),
      }),
      status: 'DUPLICATE_DETECTED',
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

    throw new Error(
      `Multiple Vault documents already exist for "${testFileName}". Upload blocked.`,
    );
  }

  // -----------------------------------------
  // Step 10: New document → begin upload
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
  // Step 11: Perform upload
  // -----------------------------------------

  try {
    await vaultPage.uploadTestDocument(
      testFilePath,
    );

    console.log(
      'Upload operation: PASS',
    );
  } catch (error) {
    // ---------------------------------------
    // Upload request itself failed
    // ---------------------------------------

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

  // -----------------------------------------
  // Step 12: Reconcile actual Vault state
  // -----------------------------------------

  try {
    const postUploadCount =
      await vaultPage.getDocumentMatchCount(
        testFileName,
      );

    console.log(
      `Vault matches after upload: ${postUploadCount}`,
    );

    // ---------------------------------------
    // Exactly one copy
    // ---------------------------------------

    if (postUploadCount === 1) {
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
        `Document visible in Vault: ${testFileName} — PASS`,
      );

      console.log(
        'Local status: UPLOADED',
      );

      console.log('----------------------------------------');
      console.log(
        'CONTROLLED UPLOAD: HEALTHY',
      );
      console.log('========================================');

      return;
    }

    // ---------------------------------------
    // Duplicate copies after upload
    // ---------------------------------------

    if (postUploadCount > 1) {
      uploadState[testFileName] = {
        ...(uploadState[testFileName] ?? {
          size: fileStats.size,
          modifiedTimeMs: fileStats.mtimeMs,
          sha256: '',
          detectedAt:
            new Date().toISOString(),
        }),
        status: 'DUPLICATE_DETECTED',
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

      throw new Error(
        `Upload produced ${postUploadCount} Vault copies of "${testFileName}".`,
      );
    }

    // ---------------------------------------
    // Upload succeeded but Vault cannot
    // confirm the document
    // ---------------------------------------

    uploadState[testFileName] = {
      ...(uploadState[testFileName] ?? {
        size: fileStats.size,
        modifiedTimeMs: fileStats.mtimeMs,
        sha256: '',
        detectedAt:
          new Date().toISOString(),
      }),
      status: 'UPLOAD_UNKNOWN',
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
      'Upload request completed, but Vault verification found 0 matches.',
    );

    console.error(
      'Local status: UPLOAD_UNKNOWN',
    );

    console.error(
      'Automatic retry: BLOCKED',
    );

    throw new Error(
      `Upload result for "${testFileName}" could not be reconciled. Automatic retry blocked.`,
    );
  } catch (error) {
    // Do not overwrite a more specific state such as
    // UPLOAD_UNKNOWN or DUPLICATE_DETECTED.
    const currentState =
      uploadState[testFileName];

    if (
      currentState?.status !==
        'UPLOAD_UNKNOWN' &&
      currentState?.status !==
        'DUPLICATE_DETECTED'
    ) {
      uploadState[testFileName] = {
        ...(currentState ?? {
          size: fileStats.size,
          modifiedTimeMs: fileStats.mtimeMs,
          sha256: '',
          detectedAt:
            new Date().toISOString(),
        }),
        status: 'UPLOAD_UNKNOWN',
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
    }

    throw error;
  }
});