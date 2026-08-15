import 'dotenv/config';
import { chromium } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

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

type UploadState = Record<string, FileState>;
type UploadSummary = {
  totalUploaded: number;
  totalAlreadyExists: number;
  totalFailed: number;
  lastUpload?: {
    fileName: string;
    uploadedAt: string;
  };
};

function refreshUploadSummaryFromState(
  state: UploadState,
  summary: UploadSummary,
): void {
  const stateEntries =
    Object.values(state);

  summary.totalUploaded =
    stateEntries.filter(
      (fileState) =>
        fileState.status ===
        'UPLOADED',
    ).length;

  summary.totalAlreadyExists =
    stateEntries.filter(
      (fileState) =>
        fileState.status ===
        'ALREADY_EXISTS',
    ).length;

  summary.totalFailed =
    stateEntries.filter(
      (fileState) =>
        fileState.status ===
        'FAILED',
    ).length;
}

type AuditAction =
  | 'UPLOAD'
  | 'SKIP_ALREADY_EXISTS'
  | 'BLOCK_DUPLICATE'
  | 'BLOCK_MISSING_FROM_VAULT'
  | 'BLOCK_LOCAL_FILE_CHANGED'
  | 'UPLOAD_FAILED'
  | 'UPLOAD_UNKNOWN';

type AuditEntry = {
  timestamp: string;
  fileName: string;
  previousStatus: FileStatus;
  vaultMatchesBefore: number;
  action: AuditAction;
  vaultMatchesAfter?: number;
  finalStatus: FileStatus;
  message?: string;
};

type AuditSummary = {
  totalEvents: number;
  successfulUploads: number;
  alreadyExists: number;
  duplicateBlocked: number;
  missingFromVault: number;
  localFileChanged: number;
  uploadFailures: number;
  unknownResults: number;
};

const ROOT_DIRECTORY = process.cwd();

const TOUPLOAD_DIRECTORY =
  path.resolve(
    ROOT_DIRECTORY,
    'ToUpload',
  );

const STATUS_DIRECTORY =
  path.resolve(
    ROOT_DIRECTORY,
    'UploadStatus',
  );

const STATUS_FILE =
  path.join(
    STATUS_DIRECTORY,
    'toupload-state.json',
  );

  const AUDIT_FILE =
  path.join(
    STATUS_DIRECTORY,
    'upload-audit.jsonl',
  );

  const AUDIT_SUMMARY_FILE =
  path.join(
    STATUS_DIRECTORY,
    'upload-audit-summary.json',
  );

  const MONITOR_HEALTH_FILE =
  path.join(
    STATUS_DIRECTORY,
    'monitor-health.jsonl',
  );

const SUMMARY_FILE =
  path.join(
    STATUS_DIRECTORY,
    'upload-summary.json',
  );  

async function calculateSha256(
  filePath: string,
): Promise<string> {
  const buffer =
    await fs.readFile(filePath);

  return crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex');
}

async function loadUploadState(): Promise<UploadState> {
  try {
    const content =
      await fs.readFile(
        STATUS_FILE,
        'utf8',
      );

    return JSON.parse(
      content,
    ) as UploadState;
  } catch {
    return {};
  }
}

async function saveUploadState(
  state: UploadState,
): Promise<void> {
  await fs.mkdir(
    STATUS_DIRECTORY,
    {
      recursive: true,
    },
  );

  await fs.writeFile(
    STATUS_FILE,
    JSON.stringify(
      state,
      null,
      2,
    ),
    'utf8',
  );
}
//
async function loadUploadSummary(): Promise<UploadSummary> {
  const state =
    await loadUploadState();

  const uploadedEntries =
    Object.entries(state)
      .filter(
        ([, fileState]) =>
          (
            fileState.status ===
              'UPLOADED' ||
            (
              fileState.status ===
                'LOCAL_FILE_MISSING' &&
              fileState.previousStatusBeforeLocalMissing ===
                'UPLOADED'
            )
          ) &&
          !!fileState.uploadedAt,
      );

  const alreadyExistsEntries =
    Object.entries(state)
      .filter(
        ([, fileState]) =>
          fileState.status ===
            'ALREADY_EXISTS' ||
          (
            fileState.status ===
              'LOCAL_FILE_MISSING' &&
            fileState.previousStatusBeforeLocalMissing ===
              'ALREADY_EXISTS'
          ),
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
    ] of uploadedEntries
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

  const summary: UploadSummary = {
    totalUploaded:
      uploadedEntries.length,

    totalAlreadyExists:
      alreadyExistsEntries.length,

    totalFailed:
      Object.values(state).filter(
        (fileState) =>
          fileState.status ===
          'FAILED',
      ).length,

    ...(lastUpload
      ? {
          lastUpload,
        }
      : {}),
  };

  await saveUploadSummary(
    summary,
  );

  return summary;
}

async function saveUploadSummary(
  summary: UploadSummary,
): Promise<void> {
  await fs.mkdir(
    STATUS_DIRECTORY,
    {
      recursive: true,
    },
  );

  await fs.writeFile(
    SUMMARY_FILE,
    JSON.stringify(
      summary,
      null,
      2,
    ),
    'utf8',
  );
}

async function loadAuditSummary(): Promise<AuditSummary> {
  try {
    const raw =
      await fs.readFile(
        AUDIT_SUMMARY_FILE,
        'utf8',
      );

    return JSON.parse(
      raw,
    ) as AuditSummary;
  } catch {
      return {
      totalEvents: 0,
      successfulUploads: 0,
      alreadyExists: 0,
      duplicateBlocked: 0,
      missingFromVault: 0,
      localFileChanged: 0,
      uploadFailures: 0,
      unknownResults: 0,
    };
  }
}

async function saveAuditSummary(
  summary: AuditSummary,
): Promise<void> {
  await fs.mkdir(
    STATUS_DIRECTORY,
    {
      recursive: true,
    },
  );

  await fs.writeFile(
    AUDIT_SUMMARY_FILE,
    JSON.stringify(
      summary,
      null,
      2,
    ),
    'utf8',
  );
}


      async function appendAuditLog(
        entry: AuditEntry,
      ): Promise<void> {
        await fs.mkdir(
          STATUS_DIRECTORY,
          {
            recursive: true,
          },
        );

        // -----------------------------------------
        // Append new audit event
        // -----------------------------------------

        await fs.appendFile(
          AUDIT_FILE,
          `${JSON.stringify(entry)}\n`,
          'utf8',
        );

        // -----------------------------------------
        // Rebuild audit summary from audit log
        // -----------------------------------------
        // The JSONL audit file is the source of truth.
        // This prevents summary drift if a previous
        // summary write was interrupted or duplicated.

        const rawAudit =
          await fs.readFile(
            AUDIT_FILE,
            'utf8',
          );

        const entries: AuditEntry[] =
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

       const summary: AuditSummary = {
                  totalEvents:
                    entries.length,

                  successfulUploads:
                    entries.filter(
                      (auditEntry) =>
                        auditEntry.action ===
                        'UPLOAD',
                    ).length,

                  alreadyExists:
                    entries.filter(
                      (auditEntry) =>
                        auditEntry.action ===
                        'SKIP_ALREADY_EXISTS',
                    ).length,

                  duplicateBlocked:
                    entries.filter(
                      (auditEntry) =>
                        auditEntry.action ===
                        'BLOCK_DUPLICATE',
                    ).length,

                  missingFromVault:
                    entries.filter(
                      (auditEntry) =>
                        auditEntry.action ===
                        'BLOCK_MISSING_FROM_VAULT',
                    ).length,

                  localFileChanged:
                    entries.filter(
                      (auditEntry) =>
                        auditEntry.action ===
                        'BLOCK_LOCAL_FILE_CHANGED',
                    ).length,

                  uploadFailures:
                    entries.filter(
                      (auditEntry) =>
                        auditEntry.action ===
                        'UPLOAD_FAILED',
                    ).length,

                  unknownResults:
                    entries.filter(
                      (auditEntry) =>
                        auditEntry.action ===
                        'UPLOAD_UNKNOWN',
                    ).length,
                };

        await saveAuditSummary(
          summary,
        );
      }
//===============
      // -----------------------------------------
      // Monitor health check
      // -----------------------------------------

      async function checkMonitorHealth(
        state: UploadState,
        summary: UploadSummary,
        currentVaultDocumentCount: number,
      ): Promise<boolean> {
        // -----------------------------------------
        // Calculate current local state counts
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
        // Upload summary ↔ state
        // -----------------------------------------

        const uploadSummaryMatchesState =
          summary.totalUploaded ===
            uploadedStateCount &&
          summary.totalAlreadyExists ===
            alreadyExistsStateCount &&
          summary.totalFailed ===
            failedStateCount;

        // -----------------------------------------
        // Read audit summary
        // -----------------------------------------

        const auditSummary =
          await loadAuditSummary();

        // -----------------------------------------
        // Read audit JSONL
        // -----------------------------------------

        let auditEntries: AuditEntry[] = [];

        try {
          const rawAudit =
            await fs.readFile(
              AUDIT_FILE,
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
        // Audit summary ↔ audit log
        // -----------------------------------------

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

        // -----------------------------------------
        // Check for unresolved problem states
        // -----------------------------------------

        const localFileMissingStateCount =
              stateEntries.filter(
                (fileState) =>
                  fileState.status ===
                  'LOCAL_FILE_MISSING',
              ).length;

            const localFileChangedStateCount =
              stateEntries.filter(
                (fileState) =>
                  fileState.status ===
                  'LOCAL_FILE_CHANGED',
              ).length;

            // -----------------------------------------
            // LOCAL STATE HEALTH DETAILS
            // -----------------------------------------

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
              `LOCAL_FILE_MISSING: ${
                localFileMissingStateCount
              }`,
            );

            console.log(
              `LOCAL_FILE_CHANGED: ${
                localFileChangedStateCount
              }`,
            );

            console.log(
              '----------------------------------------',
            );



         const noProblemStates =
          detectedStateCount === 0 &&
          uploadingStateCount === 0 &&
          unknownStateCount === 0 &&
          missingStateCount === 0 &&
          duplicateStateCount === 0 &&
          localFileMissingStateCount === 0 &&
          localFileChangedStateCount === 0;



        // -----------------------------------------
        // Local state ↔ Family Vault
        // -----------------------------------------

        const trackedDocumentsMatchVault =
          stateEntries.length ===
          currentVaultDocumentCount;

        // -----------------------------------------
        // Overall health
        // -----------------------------------------

        const overallHealth =
          uploadSummaryMatchesState &&
          auditSummaryMatchesAuditLog &&
          noProblemStates &&
          trackedDocumentsMatchVault;

          // -----------------------------------------
          // Persist monitor health history
          // -----------------------------------------

          const healthEntry = {
            timestamp:
              new Date().toISOString(),

            vaultDocumentCount:
              currentVaultDocumentCount,

            trackedDocuments:
              stateEntries.length,

            stateConsistency:
              uploadSummaryMatchesState
                ? 'PASS'
                : 'FAIL',

            auditConsistency:
              auditSummaryMatchesAuditLog
                ? 'PASS'
                : 'FAIL',

            problemStates:
              noProblemStates
                ? 'PASS'
                : 'FAIL',

            vaultConsistency:
              trackedDocumentsMatchVault
                ? 'PASS'
                : 'FAIL',

            overallHealth:
              overallHealth
                ? 'PASS'
                : 'FAIL',
          };

          await fs.mkdir(
            STATUS_DIRECTORY,
            {
              recursive: true,
            },
          );

          await fs.appendFile(
            MONITOR_HEALTH_FILE,
            `${JSON.stringify(healthEntry)}\n`,
            'utf8',
          );

        // -----------------------------------------
        // Display health report
        // -----------------------------------------

        console.log(
          '----------------------------------------',
        );

        console.log(
          'MONITOR HEALTH',
        );

        console.log(
          '----------------------------------------',
        );

        console.log(
          `State consistency: ${
            uploadSummaryMatchesState
              ? 'PASS'
              : 'FAIL'
          }`,
        );

        console.log(
          `Audit consistency: ${
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
          `Vault consistency: ${
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
          '----------------------------------------',
        );

        return overallHealth;
      }
//===============

async function getToUploadFiles(): Promise<
  string[]
> {
  await fs.mkdir(
    TOUPLOAD_DIRECTORY,
    {
      recursive: true,
    },
  );

  const entries =
    await fs.readdir(
      TOUPLOAD_DIRECTORY,
      {
        withFileTypes: true,
      },
    );

  const files: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    files.push(entry.name);
  }

  return files.sort();
}

async function inspectToUpload(
  state: UploadState,
): Promise<{
  newFiles: string[];
  changedFiles: string[];
}> {
  const fileNames =
    await getToUploadFiles();

  const newFiles: string[] = [];
  const changedFiles: string[] = [];

      // -----------------------------------------
      // Detect files removed from ToUpload
      // -----------------------------------------
      //
      // IMPORTANT:
      // This only changes LOCAL monitor state.
      // It NEVER deletes or modifies Family Vault.
      //

      const currentFileNameSet =
        new Set(fileNames);

      for (
        const [
          trackedFileName,
          trackedFileState,
        ] of Object.entries(state)
      ) {
        if (
          currentFileNameSet.has(
            trackedFileName,
          )
        ) {
          continue;
        }

        // Already recorded as locally missing.
        if (
          trackedFileState.status ===
          'LOCAL_FILE_MISSING'
        ) {
          continue;
        }

        // -----------------------------------------
        // Mark local file as missing
        // -----------------------------------------

        state[trackedFileName] = {
            ...trackedFileState,
            status:
              'LOCAL_FILE_MISSING',
            previousStatusBeforeLocalMissing:
              trackedFileState.status,
          };

        console.log(
          '----------------------------------------',
        );

        console.log(
          `LOCAL FILE MISSING: ${trackedFileName}`,
        );

        console.log(
          'Family Vault: NOT MODIFIED',
        );

        console.log(
          'Action: LOCAL STATE ONLY',
        );

        console.log(
          '----------------------------------------',
        );
      }

      // -----------------------------------------
      // Process files currently present
      // -----------------------------------------

  for (const fileName of fileNames) {
    const filePath =
      path.join(
        TOUPLOAD_DIRECTORY,
        fileName,
      );

    const stats =
      await fs.stat(filePath);

    const sha256 =
      await calculateSha256(
        filePath,
      );

    const previous =
      state[fileName];

    if (!previous) {
      state[fileName] = {
        size: stats.size,
        modifiedTimeMs:
          stats.mtimeMs,
        sha256,
        status: 'DETECTED',
        detectedAt:
          new Date().toISOString(),
      };

      newFiles.push(fileName);

      continue;
    }

    const changed =
      previous.size !== stats.size ||
      previous.modifiedTimeMs !==
        stats.mtimeMs ||
      previous.sha256 !== sha256;

    if (changed) {
      state[fileName] = {
        ...previous,
        size: stats.size,
        modifiedTimeMs:
          stats.mtimeMs,
        sha256,
        status: 'DETECTED',
        detectedAt:
          new Date().toISOString(),
      };

      changedFiles.push(fileName);
    }
  }

  await saveUploadState(state);

  return {
    newFiles,
    changedFiles,
  };
}

//===============
async function processDocument(
  fileName: string,
  state: UploadState,
  summary: UploadSummary,
  vaultPage: VaultPage,
): Promise<void> {
  const filePath =
    path.join(
      TOUPLOAD_DIRECTORY,
      fileName,
    );

  const currentState =
    state[fileName];

  if (!currentState) {
    throw new Error(
      `No local state exists for "${fileName}".`,
    );
  }

  console.log(
    `\nPROCESSING: ${fileName}`,
  );

  console.log(
    `Local status: ${currentState.status}`,
  );

  // -----------------------------------------
  // Check actual Vault state
  // -----------------------------------------

  const existingCount =
    await vaultPage.getDocumentMatchCount(
      fileName,
    );

  console.log(
    `Vault matches: ${existingCount}`,
  );

  // -----------------------------------------
  // Exactly ONE copy already exists
  // -----------------------------------------

  if (existingCount === 1) {

    // ---------------------------------------
    // Already uploaded by this watcher
    // ---------------------------------------

    if (
      currentState.status ===
      'UPLOADED'
    ) {
      console.log(
        `Document already uploaded and exists in Vault: ${fileName}`,
      );

      return;
    }

    // ---------------------------------------
    // Already known as existing
    // ---------------------------------------

    if (
      currentState.status ===
      'ALREADY_EXISTS'
    ) {
      await appendAuditLog({
        timestamp:
          new Date().toISOString(),

        fileName,

        previousStatus:
          currentState.status,

        vaultMatchesBefore:
          existingCount,

        action:
          'SKIP_ALREADY_EXISTS',

        vaultMatchesAfter:
          existingCount,

        finalStatus:
          'ALREADY_EXISTS',

        message:
          'Document already exists in Family Vault. Upload skipped.',
      });

      console.log(
        `Document already exists in Vault: ${fileName}`,
      );

      return;
    }
// ---------------------------------------
// New/detected file but exactly ONE
// document already exists in Family Vault
// ---------------------------------------
//
// IMPORTANT:
// If this file was previously uploaded and
// the local content has now changed, do NOT
// silently convert it to ALREADY_EXISTS.
//
// The Vault copy must be preserved.
// Automatic overwrite/version upload is blocked.
// ---------------------------------------

if (
  currentState.status ===
    'DETECTED' &&
  currentState.previousStatusBeforeLocalMissing !==
    'ALREADY_EXISTS'
) {
  // ---------------------------------------
  // Local file changed after a previous
  // upload, while the Vault still contains
  // the original document.
  // ---------------------------------------

  const wasPreviouslyUploaded =
    currentState.uploadedAt !==
    undefined;

  if (wasPreviouslyUploaded) {
    state[fileName] = {
      ...currentState,
      status:
        'LOCAL_FILE_CHANGED',
    };

    await saveUploadState(
      state,
    );

    // -------------------------------------
    // Keep upload summary unchanged.
    //
    // This is NOT a new upload and NOT an
    // ALREADY_EXISTS event.
    // -------------------------------------

    await saveUploadSummary(
      summary,
    );

    // -------------------------------------
    // Audit blocked local-file change
    // -------------------------------------

    await appendAuditLog({
      timestamp:
        new Date().toISOString(),

      fileName,

      previousStatus:
        currentState.status,

      vaultMatchesBefore:
        existingCount,

      action:
        'BLOCK_LOCAL_FILE_CHANGED',

      vaultMatchesAfter:
        existingCount,

      finalStatus:
        'LOCAL_FILE_CHANGED',

      message:
        'Local ToUpload file changed after previous upload. Family Vault document preserved. Automatic overwrite/version upload blocked.',
    });

    console.log(
      'Action: BLOCKED — local file changed after previous upload',
    );

    console.log(
      'Family Vault document preserved',
    );

    return;
  }
}

// -----------------------------------------
// New/detected file + exactly one matching
// Vault document.
//
// This is the existing ALREADY_EXISTS
// behavior for files that were not previously
// uploaded by this watcher.
// -----------------------------------------

      state[fileName] = {
        ...currentState,
        status:
          'ALREADY_EXISTS',
      };

      await saveUploadState(
        state,
      );

      // -----------------------------------------
      // Refresh ALREADY_EXISTS count
      // -----------------------------------------

      refreshUploadSummaryFromState(
        state,
        summary,
      );

      await saveUploadSummary(
        summary,
      );

      // -----------------------------------------
      // Audit existing Vault document
      // -----------------------------------------

      await appendAuditLog({
        timestamp:
          new Date().toISOString(),

        fileName,

        previousStatus:
          currentState.status,

        vaultMatchesBefore:
          existingCount,

        action:
          'SKIP_ALREADY_EXISTS',

        vaultMatchesAfter:
          existingCount,

        finalStatus:
          'ALREADY_EXISTS',

        message:
          'Document already exists in Family Vault. Upload skipped.',
      });

      console.log(
        'Action: SKIP — matching document already exists',
      );

      return;
        }

  // -----------------------------------------
  // MORE THAN ONE copy exists
  // -----------------------------------------

  if (existingCount > 1) {
    state[fileName] = {
      ...currentState,
      status: 'DUPLICATE_DETECTED',
    };

    await saveUploadState(
      state,
    );

    // ---------------------------------------
    // Audit duplicate detection
    // ---------------------------------------

    await appendAuditLog({
      timestamp:
        new Date().toISOString(),

      fileName,

      previousStatus:
        currentState.status,

      vaultMatchesBefore:
        existingCount,

      action:
        'BLOCK_DUPLICATE',

      vaultMatchesAfter:
        existingCount,

      finalStatus:
        'DUPLICATE_DETECTED',

      message:
        'Multiple matching Vault documents detected. Automatic upload blocked.',
    });

    console.log(
      'Action: BLOCKED — duplicate documents detected',
    );

    return;
  }

  // -----------------------------------------
  // ZERO copies exist
  // -----------------------------------------

  // Previously uploaded/known document
  // is now missing from Family Vault.
  if (
    currentState.status ===
      'UPLOADED' ||
    currentState.status ===
      'ALREADY_EXISTS'
  ) {
    state[fileName] = {
      ...currentState,
      status: 'MISSING_FROM_VAULT',
    };

    await saveUploadState(
      state,
    );

    // ---------------------------------------
    // Audit missing Vault document
    // ---------------------------------------

    await appendAuditLog({
      timestamp:
        new Date().toISOString(),

      fileName,

      previousStatus:
        currentState.status,

      vaultMatchesBefore:
        existingCount,

      action:
        'BLOCK_MISSING_FROM_VAULT',

      vaultMatchesAfter:
        existingCount,

      finalStatus:
        'MISSING_FROM_VAULT',

      message:
        'Previously uploaded/known document is missing from Family Vault. Automatic re-upload blocked.',
    });

    console.log(
      'Action: BLOCKED — previously uploaded document is missing',
    );

    return;
  }

  // -----------------------------------------
  // New document + Vault has zero matches
  // -----------------------------------------

  state[fileName] = {
    ...currentState,
    status: 'UPLOADING',
  };

  await saveUploadState(
    state,
  );

  console.log(
    'Action: UPLOAD',
  );

  try {
    await vaultPage.uploadTestDocument(
      filePath,
    );

    console.log(
      'Upload request: PASS',
    );
  } catch (error) {
    state[fileName] = {
      ...state[fileName],
      status: 'FAILED',
    };

    await saveUploadState(
      state,
    );

    summary.totalFailed += 1;

    await saveUploadSummary(
      summary,
    );

    // ---------------------------------------
    // Audit failed upload
    // ---------------------------------------

    await appendAuditLog({
      timestamp:
        new Date().toISOString(),

      fileName,

      previousStatus:
        currentState.status,

      vaultMatchesBefore:
        existingCount,

      action:
        'UPLOAD_FAILED',

      finalStatus:
        'FAILED',

      message:
        'Upload request failed before successful Vault reconciliation.',
    });

    console.error(
      'Upload request: FAILED',
    );

    throw error;
  }

  // -----------------------------------------
  // Reconcile after upload
  // -----------------------------------------

  const postUploadCount =
    await vaultPage.getDocumentMatchCount(
      fileName,
    );

  console.log(
    `Vault matches after upload: ${postUploadCount}`,
  );

  // -----------------------------------------
  // Exactly ONE copy after upload
  // -----------------------------------------

  if (postUploadCount === 1) {
    const uploadedAt =
      new Date().toISOString();

    state[fileName] = {
      ...state[fileName],
      status: 'UPLOADED',
      uploadedAt,
    };

    await saveUploadState(
      state,
    );

    // ---------------------------------------
    // Refresh upload summary from current state
    // ---------------------------------------

    refreshUploadSummaryFromState(
      state,
      summary,
    );

    summary.lastUpload = {
      fileName,
      uploadedAt,
    };

    await saveUploadSummary(
      summary,
    );

    // ---------------------------------------
    // Audit successful upload
    // ---------------------------------------

    await appendAuditLog({
      timestamp:
        uploadedAt,

      fileName,

      previousStatus:
        currentState.status,

      vaultMatchesBefore:
        existingCount,

      action:
        'UPLOAD',

      vaultMatchesAfter:
        postUploadCount,

      finalStatus:
        'UPLOADED',

      message:
        'Document uploaded successfully and exactly one Vault copy was confirmed.',
    });

    console.log(
      'Final status: UPLOADED',
    );

    return;
  }

  // -----------------------------------------
  // MORE THAN ONE copy after upload
  // -----------------------------------------

  if (postUploadCount > 1) {
    state[fileName] = {
      ...state[fileName],
      status: 'DUPLICATE_DETECTED',
    };

    await saveUploadState(
      state,
    );

    // ---------------------------------------
    // Audit duplicate after upload
    // ---------------------------------------

    await appendAuditLog({
      timestamp:
        new Date().toISOString(),

      fileName,

      previousStatus:
        currentState.status,

      vaultMatchesBefore:
        existingCount,

      action:
        'BLOCK_DUPLICATE',

      vaultMatchesAfter:
        postUploadCount,

      finalStatus:
        'DUPLICATE_DETECTED',

      message:
        'Multiple Vault copies were detected after upload.',
    });

    console.error(
      'Final status: DUPLICATE_DETECTED',
    );

    return;
  }

  // -----------------------------------------
  // Upload result cannot be reconciled
  // -----------------------------------------

  state[fileName] = {
    ...state[fileName],
    status: 'UPLOAD_UNKNOWN',
  };

  await saveUploadState(
    state,
  );

  // -----------------------------------------
  // Audit unknown upload result
  // -----------------------------------------

  await appendAuditLog({
    timestamp:
      new Date().toISOString(),

    fileName,

    previousStatus:
      currentState.status,

    vaultMatchesBefore:
      existingCount,

    action:
      'UPLOAD_UNKNOWN',

    vaultMatchesAfter:
      postUploadCount,

    finalStatus:
      'UPLOAD_UNKNOWN',

    message:
      'Upload request completed, but the final Family Vault state could not be reconciled.',
  });

  console.error(
    'Final status: UPLOAD_UNKNOWN',
  );
}

async function runWatcherCycle(): Promise<void> {
  console.log('========================================');
  console.log('FAMILY VAULT TOUPLOAD WATCHER');
  console.log('========================================');
  console.log(
    `ToUpload: ${TOUPLOAD_DIRECTORY}`,
  );
  console.log(
    `Status: ${STATUS_FILE}`,
  );
  console.log('----------------------------------------');

  const state =
    await loadUploadState();

    const summary =
  await loadUploadSummary();

  const inspection =
    await inspectToUpload(state);

  // -----------------------------------------
  // Include pending DETECTED documents
  // -----------------------------------------
  // A previous inspection may already have
  // recorded a document as DETECTED.
  // It must still be processed by the watcher.

  const pendingDetectedFiles =
    Object.entries(state)
      .filter(
        ([, fileState]) =>
          fileState.status === 'DETECTED',
      )
      .map(
        ([fileName]) => fileName,
      );

  const filesToProcess =
    Array.from(
      new Set([
        ...inspection.newFiles,
        ...inspection.changedFiles,
        ...pendingDetectedFiles,
      ]),
    );

  console.log(
    `Documents detected: ${
      inspection.newFiles.length
    } new, ${
      inspection.changedFiles.length
    } changed`,
  );

  console.log(
    `Pending DETECTED documents: ${
      pendingDetectedFiles.length
    }`,
  );

  if (filesToProcess.length === 0) {
  console.log(
    'No new, changed, or pending documents.',
  );
}

  const browser =
    await chromium.launch({
      headless: false,
    });

  const page =
    await browser.newPage({
      baseURL: testConfig.baseUrl,
    });

  try {
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

   // -----------------------------------------
// Current Family Vault document count
// -----------------------------------------

const currentVaultDocumentCount =
  await vaultPage.getDocumentCount();

console.log(
  '----------------------------------------',
);

console.log(
  'CURRENT FAMILY VAULT STATUS',
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
  `Successfully uploaded by Monitor: ${
    summary.totalUploaded
  }`,
);

console.log(
  `Already existed in Vault: ${
    summary.totalAlreadyExists
  }`,
);

console.log(
  `Failed uploads: ${
    summary.totalFailed
  }`,
);

console.log(
  '----------------------------------------',
);
//=========
// -----------------------------------------
// Process documents only when required
// -----------------------------------------

      if (
        filesToProcess.length > 0
      ) {
        for (
          const fileName of filesToProcess
        ) {
          await processDocument(
            fileName,
            state,
            summary,
            vaultPage,
          );
        }
      }

      // -----------------------------------------
      // Refresh Vault count after processing
      // -----------------------------------------

      const finalVaultDocumentCount =
        await vaultPage.getDocumentCount();

      // -----------------------------------------
      // Monitor health check
      // -----------------------------------------

      await checkMonitorHealth(
        state,
        summary,
        finalVaultDocumentCount,
      );

      // -----------------------------------------
      // Upload summary
      // -----------------------------------------

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
  `Successfully uploaded by Monitor: ${
    summary.totalUploaded
  }`,
);

console.log(
  `Already existed in Vault: ${
    summary.totalAlreadyExists
  }`,
);

console.log(
  `Failed uploads: ${
    summary.totalFailed
  }`,
);

console.log(
  `Last upload: ${
    summary.lastUpload
      ? summary.lastUpload.fileName
      : 'None'
  }`,
);

console.log(
  '----------------------------------------',
);

console.log(
  'TOUPLOAD WATCHER CYCLE: COMPLETE',
);

console.log(
  '========================================',
);

  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const WATCH_INTERVAL_MS =
    60 * 1000;

  console.log('========================================');
  console.log(
    'FAMILY VAULT TOUPLOAD CONTINUOUS WATCHER',
  );
  console.log('========================================');
  console.log(
    'Scan interval: 60 seconds',
  );
  console.log(
    'Press Ctrl+C to stop.',
  );
  console.log('========================================');

  while (true) {
    try {
      await runWatcherCycle();
    } catch (error) {
      console.error('========================================');
      console.error(
        'TOUPLOAD WATCHER CYCLE FAILED',
      );
      console.error(error);
      console.error('========================================');
    }

    console.log(
      `Next scan in ${
        WATCH_INTERVAL_MS / 1000
      } seconds...`,
    );

    await new Promise<void>(
      (resolve) =>
        setTimeout(
          resolve,
          WATCH_INTERVAL_MS,
        ),
    );
  }
}

if (
  process.argv.includes(
    '--once',
  )
) {
  runWatcherCycle().catch((error) => {
    console.error(
      '========================================',
    );

    console.error(
      'TOUPLOAD WATCHER: FAILED',
    );

    console.error(error);

    console.error(
      '========================================',
    );

    process.exitCode = 1;
  });
} else {
  main().catch((error) => {
    console.error(
      '========================================',
    );

    console.error(
      'TOUPLOAD WATCHER: FAILED',
    );

    console.error(error);

    console.error(
      '========================================',
    );

    process.exitCode = 1;
  });
}