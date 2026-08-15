import {
  test,
} from '@playwright/test';

import fs from 'fs/promises';
import path from 'path';

import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

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

type UploadSummary = {
  totalUploaded: number;
  totalAlreadyExists: number;
  totalFailed: number;
  lastUpload?: {
    fileName: string;
    uploadedAt: string;
  };
};

type AuditSummary = {
  totalEvents: number;
  successfulUploads: number;
  alreadyExists: number;
  duplicateBlocked: number;
  missingFromVault: number;
  uploadFailures: number;
  unknownResults: number;
};

type AuditEntry = {
  timestamp: string;
  fileName: string;
  previousStatus: FileStatus;
  vaultMatchesBefore: number;
  action:
    | 'UPLOAD'
    | 'SKIP_ALREADY_EXISTS'
    | 'BLOCK_DUPLICATE'
    | 'BLOCK_MISSING_FROM_VAULT'
    | 'UPLOAD_FAILED'
    | 'UPLOAD_UNKNOWN';
  vaultMatchesAfter?: number;
  finalStatus: FileStatus;
  message?: string;
};

async function readJson<T>(
  filePath: string,
  fallback: T,
): Promise<T> {
  try {
    const raw =
      await fs.readFile(
        filePath,
        'utf8',
      );

    return JSON.parse(
      raw,
    ) as T;
  } catch {
    return fallback;
  }
}

test(
  'Inspect Family Vault Monitor health',
  async ({
    page,
  }) => {
    const statusDirectory =
      path.resolve(
        process.cwd(),
        'UploadStatus',
      );

    const toUploadDirectory =
      path.resolve(
        process.cwd(),
        'ToUpload',
      );

    // -----------------------------------------
    // Read local state
    // -----------------------------------------

    const state =
      await readJson<UploadState>(
        path.join(
          statusDirectory,
          'toupload-state.json',
        ),
        {},
      );

    // -----------------------------------------
    // Read upload summary
    // -----------------------------------------

    const uploadSummary =
      await readJson<UploadSummary>(
        path.join(
          statusDirectory,
          'upload-summary.json',
        ),
        {
          totalUploaded: 0,
          totalAlreadyExists: 0,
          totalFailed: 0,
        },
      );

    // -----------------------------------------
    // Read audit summary
    // -----------------------------------------

    const auditSummary =
      await readJson<AuditSummary>(
        path.join(
          statusDirectory,
          'upload-audit-summary.json',
        ),
        {
          totalEvents: 0,
          successfulUploads: 0,
          alreadyExists: 0,
          duplicateBlocked: 0,
          missingFromVault: 0,
          uploadFailures: 0,
          unknownResults: 0,
        },
      );

         // -----------------------------------------
        // Read audit history
        // -----------------------------------------

        const auditFilePath =
        path.join(
            statusDirectory,
            'upload-audit.jsonl',
        );

        let auditEntries: AuditEntry[] = [];

        try {
        const rawAudit =
            await fs.readFile(
            auditFilePath,
            'utf8',
            );

        auditEntries =
            rawAudit
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
        } catch {
        auditEntries = [];
        }

    // -----------------------------------------
    // Count ToUpload files
    // -----------------------------------------

    const toUploadEntries =
      await fs.readdir(
        toUploadDirectory,
        {
          withFileTypes: true,
        },
      );

    const toUploadFiles =
      toUploadEntries.filter(
        (entry) =>
          entry.isFile(),
      );

    // -----------------------------------------
    // Calculate state counts
    // -----------------------------------------

    const stateEntries =
      Object.values(state);

    const uploadedStateCount =
  stateEntries.filter(
    (fileState) =>
      fileState.status ===
        'UPLOADED' ||
      (
        fileState.status ===
          'LOCAL_FILE_MISSING' &&
        fileState.previousStatusBeforeLocalMissing ===
          'UPLOADED'
      ),
  ).length;

const alreadyExistsStateCount =
  stateEntries.filter(
    (fileState) =>
      fileState.status ===
        'ALREADY_EXISTS' ||
      (
        fileState.status ===
          'LOCAL_FILE_MISSING' &&
        fileState.previousStatusBeforeLocalMissing ===
          'ALREADY_EXISTS'
      ),
  ).length;

    const failedStateCount =
      stateEntries.filter(
        (fileState) =>
          fileState.status ===
          'FAILED',
      ).length;

    const detectedStateCount =
      stateEntries.filter(
        (fileState) =>
          fileState.status ===
          'DETECTED',
      ).length;

    const uploadingStateCount =
      stateEntries.filter(
        (fileState) =>
          fileState.status ===
          'UPLOADING',
      ).length;

    const unknownStateCount =
      stateEntries.filter(
        (fileState) =>
          fileState.status ===
          'UPLOAD_UNKNOWN',
      ).length;

    const missingStateCount =
      stateEntries.filter(
        (fileState) =>
          fileState.status ===
          'MISSING_FROM_VAULT',
      ).length;

    const duplicateStateCount =
      stateEntries.filter(
        (fileState) =>
          fileState.status ===
          'DUPLICATE_DETECTED',
      ).length;

    // -----------------------------------------
// Login to Family Vault
// -----------------------------------------

      const loginPage =
        new LoginPage(page);

      const vaultPage =
        new VaultPage(page);

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

      const currentVaultDocumentCount =
        await vaultPage.getDocumentCount();

    // -----------------------------------------
    // Health checks
    // -----------------------------------------

    const uploadSummaryMatchesState =
      uploadSummary.totalUploaded ===
        uploadedStateCount &&
      uploadSummary.totalAlreadyExists ===
        alreadyExistsStateCount &&
      uploadSummary.totalFailed ===
        failedStateCount;

    const auditSummaryMatchesAuditLog =
  auditSummary.totalEvents ===
    auditEntries.length &&
  auditSummary.successfulUploads ===
    auditEntries.filter(
      (entry) =>
        entry.action ===
        'UPLOAD',
    ).length &&
  auditSummary.alreadyExists ===
    auditEntries.filter(
      (entry) =>
        entry.action ===
        'SKIP_ALREADY_EXISTS',
    ).length &&
  auditSummary.duplicateBlocked ===
    auditEntries.filter(
      (entry) =>
        entry.action ===
        'BLOCK_DUPLICATE',
    ).length &&
  auditSummary.missingFromVault ===
    auditEntries.filter(
      (entry) =>
        entry.action ===
        'BLOCK_MISSING_FROM_VAULT',
    ).length &&
  auditSummary.uploadFailures ===
    auditEntries.filter(
      (entry) =>
        entry.action ===
        'UPLOAD_FAILED',
    ).length &&
  auditSummary.unknownResults ===
    auditEntries.filter(
      (entry) =>
        entry.action ===
        'UPLOAD_UNKNOWN',
    ).length;

    const localFileMissingStateCount =
          stateEntries.filter(
            (fileState) =>
              fileState.status ===
              'LOCAL_FILE_MISSING',
          ).length;

        const noProblemStates =
          detectedStateCount === 0 &&
          uploadingStateCount === 0 &&
          unknownStateCount === 0 &&
          missingStateCount === 0 &&
          duplicateStateCount === 0 &&
          localFileMissingStateCount === 0;

    const trackedDocumentsMatchVault =
      stateEntries.length ===
      currentVaultDocumentCount;

        const overallHealth =
    uploadSummaryMatchesState &&
    auditSummaryMatchesAuditLog &&
    noProblemStates &&
    trackedDocumentsMatchVault;

    // -----------------------------------------
    // Report
    // -----------------------------------------

    console.log(
      '========================================',
    );

    console.log(
      'FAMILY VAULT MONITOR HEALTH',
    );

    console.log(
      '========================================',
    );

    console.log(
      'FAMILY VAULT',
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      `Documents currently in Vault: ${
        currentVaultDocumentCount
      }`,
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      'LOCAL STATE',
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      `Tracked documents: ${
        stateEntries.length
      }`,
    );

    console.log(
      `UPLOADED: ${
        uploadedStateCount
      }`,
    );

    console.log(
      `ALREADY_EXISTS: ${
        alreadyExistsStateCount
      }`,
    );

    console.log(
      `DETECTED: ${
        detectedStateCount
      }`,
    );

    console.log(
      `UPLOADING: ${
        uploadingStateCount
      }`,
    );

    console.log(
      `FAILED: ${
        failedStateCount
      }`,
    );

    console.log(
      `UPLOAD_UNKNOWN: ${
        unknownStateCount
      }`,
    );

    console.log(
      `MISSING_FROM_VAULT: ${
        missingStateCount
      }`,
    );

    console.log(
      `DUPLICATE_DETECTED: ${
        duplicateStateCount
      }`,
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      'UPLOAD SUMMARY',
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      `Successfully uploaded: ${
        uploadSummary.totalUploaded
      }`,
    );

    console.log(
      `Already existed: ${
        uploadSummary.totalAlreadyExists
      }`,
    );

    console.log(
      `Failed uploads: ${
        uploadSummary.totalFailed
      }`,
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      'AUDIT SUMMARY',
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      `Total audit events: ${
        auditSummary.totalEvents
      }`,
    );

    console.log(
      `Successful uploads: ${
        auditSummary.successfulUploads
      }`,
    );

    console.log(
      `Already existed: ${
        auditSummary.alreadyExists
      }`,
    );

    console.log(
      `Duplicates blocked: ${
        auditSummary.duplicateBlocked
      }`,
    );

    console.log(
      `Missing from Vault: ${
        auditSummary.missingFromVault
      }`,
    );

    console.log(
      `Upload failures: ${
        auditSummary.uploadFailures
      }`,
    );

    console.log(
      `Unknown results: ${
        auditSummary.unknownResults
      }`,
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      'CONSISTENCY CHECKS',
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      `Upload summary ↔ state: ${
        uploadSummaryMatchesState
          ? 'PASS'
          : 'FAIL'
      }`,
    );

    console.log(
        `Audit summary ↔ audit log: ${
            auditSummaryMatchesAuditLog
            ? 'PASS'
            : 'FAIL'
        }`,
        );

    console.log(
      `Problem states: ${
        noProblemStates
          ? 'PASS'
          : 'FAIL'
      }`,
    );

    console.log(
      `Tracked documents ↔ Vault count: ${
        trackedDocumentsMatchVault
          ? 'PASS'
          : 'FAIL'
      }`,
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      `OVERALL HEALTH: ${
        overallHealth
          ? 'PASS'
          : 'FAIL'
      }`,
    );

    console.log(
      '========================================',
    );
  },
);