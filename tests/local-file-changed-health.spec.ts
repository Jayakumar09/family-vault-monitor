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

type HealthStatus =
  | 'PASS'
  | 'FAIL';

type MonitorHealthEntry = {
  timestamp: string;
  vaultDocumentCount: number;
  trackedDocuments: number;
  stateConsistency: HealthStatus;
  auditConsistency: HealthStatus;
  problemStates: HealthStatus;
  vaultConsistency: HealthStatus;
  overallHealth: HealthStatus;
};

test(
  'Verify LOCAL_FILE_CHANGED causes monitor health failure',
  async ({ page }) => {
    const loginPage =
      new LoginPage(page);

    const vaultPage =
      new VaultPage(page);

    const testFileName =
      'LOCAL_CHANGE_HEALTH_REPEATABLE_TEST.txt';

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

    const healthFilePath =
      path.join(
        uploadStatusDirectory,
        'monitor-health.jsonl',
      );

    const summaryFilePath =
      path.join(
        uploadStatusDirectory,
        'upload-summary.json',
      );

    let originalAuditContents:
      | string
      | undefined;

    let originalHealthContents:
      | string
      | undefined;

    // -----------------------------------------
    // Snapshot audit history
    // -----------------------------------------

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

    // -----------------------------------------
    // Snapshot monitor health history
    // -----------------------------------------

    try {
      originalHealthContents =
        await fs.readFile(
          healthFilePath,
          'utf8',
        );
    } catch {
      originalHealthContents =
        undefined;
    }

    console.log(
      '========================================',
    );

    console.log(
      'LOCAL FILE CHANGED HEALTH TEST',
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
      // Step 2: Remove previous test state
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
        `LOCAL CHANGE HEALTH TEST ${Date.now()}\n`,
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

      expect(
        initialUploadState[
          testFileName
        ],
        'No local state found after initial upload',
      ).toBeTruthy();

      expect(
        initialUploadState[
          testFileName
        ].status,
      ).toBe(
        'UPLOADED',
      );

      console.log(
        'Initial local state: UPLOADED',
      );

      // -----------------------------------------
      // Step 8: Modify the SAME local file
      // -----------------------------------------

      await fs.appendFile(
        toUploadFilePath,
        `LOCAL FILE MODIFIED ${Date.now()}\n`,
        'utf8',
      );

      console.log(
        'ToUpload file: CHANGED',
      );

      // -----------------------------------------
      // Step 9: Run watcher again
      // -----------------------------------------

      await runWatcherOnce();

      console.log(
        'Watcher local-change health cycle: PASS',
      );

      // -----------------------------------------
      // Step 10: Verify LOCAL_FILE_CHANGED state
      // -----------------------------------------

      const changedRawState =
        await fs.readFile(
          statusFilePath,
          'utf8',
        );

      const changedUploadState =
        JSON.parse(
          changedRawState,
        ) as UploadState;

      const changedFileState =
        changedUploadState[
          testFileName
        ];

      expect(
        changedFileState,
        'No local state found after local modification',
      ).toBeTruthy();

      expect(
        changedFileState.status,
      ).toBe(
        'LOCAL_FILE_CHANGED',
      );

      console.log(
        'Local state: LOCAL_FILE_CHANGED',
      );

      // -----------------------------------------
      // Step 11: Verify BLOCK_LOCAL_FILE_CHANGED
      // -----------------------------------------

      const auditRaw =
        await fs.readFile(
          auditFilePath,
          'utf8',
        );

      const auditEntries =
        auditRaw
          .split(/\r?\n/)
          .map(
            (line) =>
              line.trim(),
          )
          .filter(
            (line) =>
              line.length > 0,
          )
          .map(
            (line) =>
              JSON.parse(
                line,
              ) as AuditEntry,
          );

      const changeAuditEntries =
        auditEntries.filter(
          (entry) =>
            entry.fileName ===
            testFileName,
        );

      const blockAuditEntries =
        changeAuditEntries.filter(
          (entry) =>
            entry.action ===
            'BLOCK_LOCAL_FILE_CHANGED',
        );

      expect(
        blockAuditEntries.length,
        'BLOCK_LOCAL_FILE_CHANGED audit entry was not recorded',
      ).toBe(1);

      expect(
        blockAuditEntries[0].finalStatus,
      ).toBe(
        'LOCAL_FILE_CHANGED',
      );

      console.log(
        'Audit action: BLOCK_LOCAL_FILE_CHANGED',
      );

      // -----------------------------------------
      // Step 12: Verify latest health history
      // -----------------------------------------

      const healthRaw =
        await fs.readFile(
          healthFilePath,
          'utf8',
        );

      const healthEntries =
        healthRaw
          .split(/\r?\n/)
          .map(
            (line) =>
              line.trim(),
          )
          .filter(
            (line) =>
              line.length > 0,
          )
          .map(
            (line) =>
              JSON.parse(
                line,
              ) as MonitorHealthEntry,
          );

      expect(
        healthEntries.length,
        'No monitor health history was recorded',
      ).toBeGreaterThan(0);

      const latestHealth =
        healthEntries[
          healthEntries.length - 1
        ];

      expect(
        latestHealth.problemStates,
      ).toBe(
        'FAIL',
      );

      expect(
        latestHealth.overallHealth,
      ).toBe(
        'FAIL',
      );

      console.log(
        `Problem states: ${
          latestHealth.problemStates
        }`,
      );

      console.log(
        `Overall health: ${
          latestHealth.overallHealth
        }`,
      );

      // -----------------------------------------
      // Step 13: Verify Vault was preserved
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
        'Family Vault document was unexpectedly modified',
      ).toBe(1);

      // -----------------------------------------
      // Final status
      // -----------------------------------------

      console.log(
        '----------------------------------------',
      );

      console.log(
        'LOCAL FILE CHANGED HEALTH: PASS',
      );

      console.log(
        'Local state: LOCAL_FILE_CHANGED',
      );

      console.log(
        'Problem states: FAIL',
      );

      console.log(
        'Overall health: FAIL',
      );

      console.log(
        'Family Vault document: PRESERVED',
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
      // Remove local test file
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
      // Rebuild upload audit summary after test cleanup
      // -----------------------------------------

      try {
        const restoredAuditRaw =
          await fs.readFile(
            auditFilePath,
            'utf8',
          );

        const restoredAuditEntries =
          restoredAuditRaw
            .split(/\r?\n/)
            .map(
              (line) =>
                line.trim(),
            )
            .filter(
              (line) =>
                line.length > 0,
            )
            .map(
              (line) =>
                JSON.parse(
                  line,
                ) as AuditEntry,
            );

        const rebuiltAuditSummary = {
          totalEvents:
            restoredAuditEntries.length,

          successfulUploads:
            restoredAuditEntries.filter(
              (entry) =>
                entry.action ===
                'UPLOAD',
            ).length,

          alreadyExists:
            restoredAuditEntries.filter(
              (entry) =>
                entry.action ===
                'SKIP_ALREADY_EXISTS',
            ).length,

          duplicateBlocked:
            restoredAuditEntries.filter(
              (entry) =>
                entry.action ===
                'BLOCK_DUPLICATE',
            ).length,

          missingFromVault:
            restoredAuditEntries.filter(
              (entry) =>
                entry.action ===
                'BLOCK_MISSING_FROM_VAULT',
            ).length,

          localFileChanged:
            restoredAuditEntries.filter(
              (entry) =>
                entry.action ===
                'BLOCK_LOCAL_FILE_CHANGED',
            ).length,

          uploadFailures:
            restoredAuditEntries.filter(
              (entry) =>
                entry.action ===
                'UPLOAD_FAILED',
            ).length,

          unknownResults:
            restoredAuditEntries.filter(
              (entry) =>
                entry.action ===
                'UPLOAD_UNKNOWN',
            ).length,
        };

        await fs.writeFile(
          auditSummaryFilePath,
          JSON.stringify(
            rebuiltAuditSummary,
            null,
            2,
          ),
          'utf8',
        );

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
      // Rebuild upload summary after test cleanup
      // -----------------------------------------

      try {
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

        const remainingRawState =
          await fs.readFile(
            statusFilePath,
            'utf8',
          );

        const remainingUploadState =
          JSON.parse(
            remainingRawState,
          ) as UploadState;

        const remainingUploadedEntries =
          Object.entries(
            remainingUploadState,
          ).filter(
            ([, fileState]) =>
              fileState.status ===
                'UPLOADED' &&
              !!fileState.uploadedAt,
          );

        const remainingAlreadyExistsEntries =
          Object.entries(
            remainingUploadState,
          ).filter(
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
          if (
            !fileState.uploadedAt
          ) {
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

      // -----------------------------------------
      // Restore monitor health history exactly
      // as it was before the test
      // -----------------------------------------

      try {
        if (
          originalHealthContents !==
          undefined
        ) {
          await fs.writeFile(
            healthFilePath,
            originalHealthContents,
            'utf8',
          );
        } else {
          await fs.writeFile(
            healthFilePath,
            '',
            'utf8',
          );
        }

        console.log(
          'Monitor health history cleanup: PASS',
        );
      } catch (cleanupError) {
        console.error(
          'Monitor health history cleanup failed:',
          cleanupError,
        );
      }

      console.log(
        '========================================',
      );
    }
  },
);
