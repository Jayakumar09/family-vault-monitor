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
  | 'LOCAL_FILE_MISSING'
  | 'LOCAL_FILE_CHANGED';

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

type AuditEntry = {
  timestamp: string;
  fileName: string;
  previousStatus: string;
  vaultMatchesBefore: number;
  action: string;
  vaultMatchesAfter: number;
  finalStatus: string;
  message: string;
};

test(
  'Verify ToUpload local modification does not overwrite Family Vault',
  async ({ page }) => {
    const loginPage =
      new LoginPage(page);

    const vaultPage =
      new VaultPage(page);

    const testFileName =
      'LOCAL_CHANGE_SAFETY_REPEATABLE_TEST.txt';

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

    const uploadStatusDirectory =
      path.resolve(
        process.cwd(),
        'UploadStatus',
      );

    const statusFilePath =
      path.join(
        uploadStatusDirectory,
        'toupload-state.json',
      );

    const auditFilePath =
      path.join(
        uploadStatusDirectory,
        'upload-audit.jsonl',
      );

    const auditSummaryFilePath =
      path.join(
        uploadStatusDirectory,
        'upload-audit-summary.json',
      );

    let originalAuditContents:
      | string
      | undefined;

    try {
      originalAuditContents =
        await fs.readFile(
          auditFilePath,
          'utf8',
        );
    } catch {
      originalAuditContents =
        undefined;
    }

           let originalAuditSummaryContents:
      | string
      | undefined;

    try {
      originalAuditSummaryContents =
        await fs.readFile(
          auditSummaryFilePath,
          'utf8',
        );
    } catch {
      originalAuditSummaryContents =
        undefined;
    }

    const summaryFilePath =
      path.join(
        uploadStatusDirectory,
        'upload-summary.json',
      );

    let originalSummaryContents:
      | string
      | undefined;

    try {
      originalSummaryContents =
        await fs.readFile(
          summaryFilePath,
          'utf8',
        );
    } catch {
      originalSummaryContents =
        undefined;
    }

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
      // Step 1: Ensure previous test fixture is absent
      // -----------------------------------------

      try {
        await fs.unlink(
          toUploadFilePath,
        );
      } catch {
        // File already absent.
      }

      // -----------------------------------------
      // Step 2: Remove previous test state if present
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
          'Previous local monitor state cleanup: PASS',
        );
      } catch {
        // State file may not exist yet.
      }

      // -----------------------------------------
      // Step 3: Create temporary ToUpload file
      // -----------------------------------------

      await fs.mkdir(
        toUploadDirectory,
        {
          recursive: true,
        },
      );

      await fs.writeFile(
        toUploadFilePath,
        `LOCAL CHANGE SAFETY TEST ORIGINAL ${Date.now()}\n`,
        'utf8',
      );

      console.log(
        'Temporary ToUpload file: CREATED',
      );

      // -----------------------------------------
      // Step 4: Run exactly one watcher cycle
      // -----------------------------------------

      await runWatcherOnce();

      console.log(
        'Watcher upload cycle: PASS',
      );

      // -----------------------------------------
      // Step 5: Login and verify Vault
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
      // Step 6: Verify exactly one Vault copy
      // -----------------------------------------

      const beforeChangeVaultCount =
        await vaultPage.getDocumentMatchCount(
          testFileName,
        );

      console.log(
        `Family Vault matches before local modification: ${
          beforeChangeVaultCount
        }`,
      );

      expect(
        beforeChangeVaultCount,
        'Temporary document was not uploaded to Family Vault',
      ).toBe(1);

      // -----------------------------------------
      // Step 7: Verify initial local state
      // -----------------------------------------

      const initialRawState =
        await fs.readFile(
          statusFilePath,
          'utf8',
        );

      const initialUploadState =
        JSON.parse(
          initialRawState,
        ) as UploadState;

      const initialFileState =
        initialUploadState[
          testFileName
        ];

      expect(
        initialFileState,
        'No persistent state found after initial upload',
      ).toBeTruthy();

      expect(
        initialFileState.status,
      ).toBe(
        'UPLOADED',
      );

      expect(
        initialFileState.uploadedAt,
      ).toBeTruthy();

      console.log(
        'Initial local state: UPLOADED',
      );

      // -----------------------------------------
      // Step 8: Modify the SAME local ToUpload file
      // -----------------------------------------

      await fs.writeFile(
        toUploadFilePath,
        `LOCAL CHANGE SAFETY TEST MODIFIED ${Date.now()}\n`,
        'utf8',
      );

      console.log(
        'ToUpload file: CHANGED',
      );

      // Confirm the local file still exists.
      expect(
        await fs
          .access(toUploadFilePath)
          .then(() => true)
          .catch(() => false),
      ).toBe(true);

      // -----------------------------------------
      // Step 9: Run watcher again
      // -----------------------------------------

      await runWatcherOnce();

      console.log(
        'Watcher local-change detection cycle: PASS',
      );

      // -----------------------------------------
      // Step 10: Verify persistent state
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
        'No persistent state found after local modification',
      ).toBeTruthy();

      expect(
        fileState.status,
      ).toBe(
        'LOCAL_FILE_CHANGED',
      );

      console.log(
        'Local state: LOCAL_FILE_CHANGED',
      );

      // -----------------------------------------
      // Step 11: Verify BLOCK_LOCAL_FILE_CHANGED audit
      // -----------------------------------------

      const auditRaw =
        await fs.readFile(
          auditFilePath,
          'utf8',
        );

      const auditEntries =
        auditRaw
          .split(/\r?\n/)
          .filter(
            (line) =>
              line.trim().length > 0,
          )
          .map(
            (line) =>
              JSON.parse(
                line,
              ) as AuditEntry,
          );

      const changeSafetyAuditEntries =
        auditEntries.filter(
          (entry) =>
            entry.fileName ===
            testFileName,
        );

      expect(
        changeSafetyAuditEntries.length,
        'No audit entry found for local file modification',
      ).toBeGreaterThan(0);

      const blockAuditEntries =
        changeSafetyAuditEntries.filter(
          (entry) =>
            entry.action ===
            'BLOCK_LOCAL_FILE_CHANGED',
        );

      expect(
        blockAuditEntries.length,
        'BLOCK_LOCAL_FILE_CHANGED audit action was not recorded',
      ).toBe(1);

      const blockAuditEntry =
        blockAuditEntries[0];

      expect(
        blockAuditEntry.finalStatus,
      ).toBe(
        'LOCAL_FILE_CHANGED',
      );

      expect(
        blockAuditEntry.vaultMatchesBefore,
      ).toBe(1);

      expect(
        blockAuditEntry.vaultMatchesAfter,
      ).toBe(1);

      console.log(
        'Audit action: BLOCK_LOCAL_FILE_CHANGED',
      );

      console.log(
        'Audit final status: LOCAL_FILE_CHANGED',
      );

      // -----------------------------------------
      // Step 12: Verify Family Vault was NOT modified
      // -----------------------------------------

      const afterChangeVaultCount =
        await vaultPage.getDocumentMatchCount(
          testFileName,
        );

      console.log(
        `Family Vault matches after local modification: ${
          afterChangeVaultCount
        }`,
      );

      expect(
        afterChangeVaultCount,
        'Family Vault document was unexpectedly duplicated or removed',
      ).toBe(1);

      // -----------------------------------------
      // Step 13: Verify no second upload occurred
      // -----------------------------------------

      const uploadAuditEntries =
        changeSafetyAuditEntries.filter(
          (entry) =>
            entry.action ===
            'UPLOAD',
        );

      expect(
        uploadAuditEntries.length,
        'A second cloud upload was unexpectedly performed after local modification',
      ).toBe(1);

      console.log(
        'Cloud upload operations for test document: 1',
      );

      console.log(
        'Cloud overwrite/version operation: NONE',
      );

      console.log(
        '----------------------------------------',
      );

      console.log(
        'LOCAL FILE CHANGE SAFETY: PASS',
      );

      console.log(
        'ToUpload file: CHANGED',
      );

      console.log(
        'Local state: LOCAL_FILE_CHANGED',
      );

      console.log(
        'Family Vault document: PRESERVED',
      );

      console.log(
        'Cloud overwrite/version operation: NONE',
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
        // Already absent.
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
      } catch (cleanupError) {
        console.error(
          'Local monitor state cleanup failed:',
          cleanupError,
        );
      }

      // -----------------------------------------
      // Restore upload audit exactly as it was
      // before the test
      // -----------------------------------------

      try {
        if (
          originalAuditContents !==
          undefined
        ) {
          await fs.writeFile(
            auditFilePath,
            originalAuditContents,
            'utf8',
          );
        } else {
          await fs.writeFile(
            auditFilePath,
            '',
            'utf8',
          );
        }

        console.log(
          'Upload audit cleanup: PASS',
        );
      } catch (cleanupError) {
        console.error(
          'Upload audit cleanup failed:',
          cleanupError,
        );
      }

      // -----------------------------------------
      // Restore upload audit summary exactly as it was
      // before the test
      // -----------------------------------------

      try {
        if (
          originalAuditSummaryContents !==
          undefined
        ) {
          await fs.writeFile(
            auditSummaryFilePath,
            originalAuditSummaryContents,
            'utf8',
          );
        } else {
          try {
            await fs.unlink(
              auditSummaryFilePath,
            );
          } catch {
            // File already absent.
          }
        }

        console.log(
          'Upload audit summary cleanup: PASS',
        );
      } catch (cleanupError) {
        console.error(
          'Upload audit summary cleanup failed:',
          cleanupError,
        );
      }

      // -----------------------------------------
      // Restore upload summary exactly as it was
      // before the test
      // -----------------------------------------

      try {
        if (
          originalSummaryContents !==
          undefined
        ) {
          await fs.writeFile(
            summaryFilePath,
            originalSummaryContents,
            'utf8',
          );
        } else {
          try {
            await fs.unlink(
              summaryFilePath,
            );
          } catch {
            // File already absent.
          }
        }

        console.log(
          'Upload summary cleanup: PASS',
        );
      } catch (cleanupError) {
        console.error(
          'Upload summary cleanup failed:',
          cleanupError,
        );
      }



      console.log(
        '========================================',
      );
    }
  },
);
