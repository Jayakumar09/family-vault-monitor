import {
  test,
  expect,
} from '@playwright/test';

import fs from 'fs/promises';
import path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync =
  promisify(execFile);

async function runWatcherOnce(): Promise<void> {
  await execFileAsync(
    process.platform === 'win32'
      ? 'npx.cmd'
      : 'npx',
    [
      'tsx',
      'scripts/toupload-watcher.ts',
      '--once',
    ],
    {
      cwd: process.cwd(),
      windowsHide: true,
      shell: true,
      maxBuffer:
        10 * 1024 * 1024,
    },
  );
}


type FileStatus =
  | 'DETECTED'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'ALREADY_EXISTS'
  | 'FAILED'
  | 'UPLOAD_UNKNOWN'
  | 'MISSING_FROM_VAULT'
  | 'DUPLICATE_DETECTED'
  | 'LOCAL_FILE_MISSING';

type FileState = {
  size: number;
  modifiedTimeMs: number;
  sha256: string;
  status: FileStatus;
  detectedAt: string;
  uploadedAt?: string;
  previousStatusBeforeLocalMissing?: FileStatus;
};

type UploadState =
  Record<string, FileState>;

test(
  'Verify ToUpload local deletion does not affect Family Vault',
  async ({ page }) => {
    const loginPage =
      new LoginPage(page);

    const vaultPage =
      new VaultPage(page);

    const testFileName =
      'LOCAL_DELETE_SAFETY_REPEATABLE_TEST.txt';

    const toUploadDirectory =
      path.resolve(
        process.cwd(),
        'ToUpload',
      );

    const toUploadFilePath =
      path.join(
        toUploadDirectory,
        testFileName,
      );

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
      'TOUPLOAD LOCAL DELETE SAFETY TEST',
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

    try {
      // -----------------------------------------
      // Step 1: Ensure test fixture is absent
      // -----------------------------------------

      try {
        await fs.unlink(
          toUploadFilePath,
        );
      } catch {
        // File already absent.
      }

      // -----------------------------------------
      // Step 2: Create temporary ToUpload file
      // -----------------------------------------

      await fs.mkdir(
        toUploadDirectory,
        {
          recursive: true,
        },
      );

      await fs.writeFile(
        toUploadFilePath,
        `LOCAL DELETE SAFETY TEST ${Date.now()}\n`,
        'utf8',
      );

      console.log(
        'Temporary ToUpload file: CREATED',
      );

      // -----------------------------------------
      // Step 3: Run exactly one watcher cycle
      // -----------------------------------------

      await execFileAsync(
        process.platform === 'win32'
          ? 'npx.cmd'
          : 'npx',
        [
          'tsx',
          'scripts/toupload-watcher.ts',
          '--once',
        ],
        {
          cwd: process.cwd(),
          windowsHide: true,
          shell: true,
          maxBuffer:
            10 * 1024 * 1024,
        },
      );

      console.log(
        'Watcher upload cycle: PASS',
      );

      // -----------------------------------------
      // Step 4: Login and verify Vault
      // -----------------------------------------

      await loginPage.open();

      await loginPage.login(
        testConfig.testEmail,
        testConfig.testPassword,
      );

      console.log(
        'Login: PASS',
      );

      await vaultPage.verifyVaultLoaded();

      console.log(
        'Vault: PASS',
      );

      // -----------------------------------------
      // Step 5: Verify exactly one Vault copy
      // -----------------------------------------

      const beforeDeleteVaultCount =
        await vaultPage.getDocumentMatchCount(
          testFileName,
        );

      console.log(
        `Family Vault matches after upload: ${
          beforeDeleteVaultCount
        }`,
      );

      expect(
        beforeDeleteVaultCount,
        'Temporary document was not uploaded to Family Vault',
      ).toBe(1);

      // -----------------------------------------
      // Step 6: Delete ONLY local ToUpload file
      // -----------------------------------------

      await fs.unlink(
        toUploadFilePath,
      );

      console.log(
        'ToUpload file: DELETED',
      );

      expect(
        await fs
          .access(toUploadFilePath)
          .then(() => true)
          .catch(() => false),
      ).toBe(false);

      // -----------------------------------------
      // Step 7: Run watcher again
      // -----------------------------------------

      await execFileAsync(
        process.platform === 'win32'
          ? 'npx.cmd'
          : 'npx',
        [
          'tsx',
          'scripts/toupload-watcher.ts',
          '--once',
        ],
        {
          cwd: process.cwd(),
          windowsHide: true,
          shell: true,
          maxBuffer:
            10 * 1024 * 1024,
        },
      );

      console.log(
        'Watcher local-delete detection cycle: PASS',
      );

      // -----------------------------------------
      // Step 8: Verify persistent state
      // -----------------------------------------

      const rawState =
        await fs.readFile(
          statusFilePath,
          'utf8',
        );

      const uploadState =
        JSON.parse(
          rawState,
        ) as UploadState;

      const fileState =
        uploadState[testFileName];

      expect(
        fileState,
        'No persistent state found after local deletion',
      ).toBeTruthy();

      expect(
        fileState.status,
      ).toBe(
        'LOCAL_FILE_MISSING',
      );

      expect(
        fileState.previousStatusBeforeLocalMissing,
      ).toBe(
        'UPLOADED',
      );

      console.log(
        'Local state: LOCAL_FILE_MISSING',
      );

      console.log(
        'Previous state: UPLOADED',
      );

      // -----------------------------------------
      // Step 9: Verify Family Vault was NOT modified
      // -----------------------------------------

      const afterDeleteVaultCount =
        await vaultPage.getDocumentMatchCount(
          testFileName,
        );

      console.log(
        `Family Vault matches after local deletion: ${
          afterDeleteVaultCount
        }`,
      );

      expect(
        afterDeleteVaultCount,
        'Family Vault document was unexpectedly removed',
      ).toBe(1);

      console.log(
        '----------------------------------------',
      );

      console.log(
        'LOCAL DELETE SAFETY: PASS',
      );

      console.log(
        'ToUpload file: DELETED',
      );

      console.log(
        'Family Vault document: PRESERVED',
      );

      console.log(
        'Cloud delete operation: NONE',
      );

      console.log(
        '========================================',
      );
    } finally {
      // -----------------------------------------
      // Cleanup
      // -----------------------------------------

      console.log(
        '----------------------------------------',
      );

      console.log(
        'TEST CLEANUP',
      );

      // -----------------------------------------
      // Remove local test file if still present
      // -----------------------------------------

      try {
        await fs.unlink(
          toUploadFilePath,
        );

        console.log(
          'Local test file cleanup: PASS',
        );
      } catch {
        // Already deleted.
      }

      // -----------------------------------------
      // Remove test document from Family Vault
      // -----------------------------------------

      try {
        const vaultMatchCount =
          await vaultPage.getDocumentMatchCount(
            testFileName,
          );

        if (
          vaultMatchCount > 0
        ) {
          await vaultPage.deleteTestDocument(
            testFileName,
          );

          console.log(
            'Family Vault test document cleanup: PASS',
          );
        }
      } catch (cleanupError) {
        console.error(
          'Family Vault test cleanup failed:',
          cleanupError,
        );
      }

      // -----------------------------------------
      // Remove test state
      // -----------------------------------------

      try {
        const rawState =
          await fs.readFile(
            statusFilePath,
            'utf8',
          );

        const uploadState =
          JSON.parse(
            rawState,
          ) as UploadState;

        delete uploadState[
          testFileName
        ];

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
// Rebuild upload summary after test cleanup
// -----------------------------------------

try {
  const summaryFilePath =
    path.resolve(
      process.cwd(),
      'UploadStatus',
      'upload-summary.json',
    );

  const summaryRaw =
    await fs.readFile(
      summaryFilePath,
      'utf8',
    );

  const uploadSummary =
    JSON.parse(
      summaryRaw,
    ) as {
      totalUploaded: number;
      totalAlreadyExists: number;
      totalFailed: number;
      lastUpload?: {
        fileName: string;
        uploadedAt: string;
      };
    };

  const remainingUploadedEntries =
    Object.entries(uploadState).filter(
      ([, fileState]) =>
        fileState.status === 'UPLOADED' &&
        !!fileState.uploadedAt,
    );

  const remainingAlreadyExistsEntries =
    Object.entries(uploadState).filter(
      ([, fileState]) =>
        fileState.status ===
        'ALREADY_EXISTS',
    );

  let lastUpload:
    | {
        fileName: string;
        uploadedAt: string;
      }
    | undefined;

  for (
    const [
      fileName,
      fileState,
    ] of remainingUploadedEntries
  ) {
    if (!fileState.uploadedAt) {
      continue;
    }

    if (
      !lastUpload ||
      fileState.uploadedAt >
        lastUpload.uploadedAt
    ) {
      lastUpload = {
        fileName,
        uploadedAt:
          fileState.uploadedAt,
      };
    }
  }

  const rebuiltSummary = {
    totalUploaded:
      remainingUploadedEntries.length,

    totalAlreadyExists:
      remainingAlreadyExistsEntries.length,

    totalFailed:
      uploadSummary.totalFailed,

    ...(lastUpload
      ? {
          lastUpload,
        }
      : {}),
  };

  await fs.writeFile(
    summaryFilePath,
    JSON.stringify(
      rebuiltSummary,
      null,
      2,
    ),
    'utf8',
  );

      console.log(
            'Upload summary cleanup: PASS',
          );
        } catch (cleanupError) {
          console.error(
            'Upload summary cleanup failed:',
            cleanupError,
          );
        }

        } catch (cleanupError) {
          console.error(
            'Local monitor state cleanup failed:',
            cleanupError,
          );
        }

      console.log(
        '========================================',
      );
    }
  },
);