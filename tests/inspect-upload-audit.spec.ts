import { test } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

type AuditEntry = {
  timestamp: string;
  fileName: string;
  previousStatus: string;
  vaultMatchesBefore: number;
  action: string;
  vaultMatchesAfter?: number;
  finalStatus: string;
  message?: string;
};

test('Inspect Family Vault upload audit history', async () => {
  const auditFilePath =
    path.resolve(
      process.cwd(),
      'UploadStatus',
      'upload-audit.jsonl',
    );

  console.log('========================================');
  console.log('FAMILY VAULT UPLOAD AUDIT');
  console.log('========================================');
  console.log(
    `Audit file: ${auditFilePath}`,
  );
  console.log('----------------------------------------');

  let raw: string;

  try {
    raw =
      await fs.readFile(
        auditFilePath,
        'utf8',
      );
  } catch {
    console.log(
      'Audit file does not exist yet.',
    );

    console.log(
      '========================================',
    );

    return;
  }

  const entries: AuditEntry[] =
    raw
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

  console.log(
    `Audit entries: ${entries.length}`,
  );

  console.log(
    '----------------------------------------',
  );

  // -----------------------------------------
  // Audit statistics
  // -----------------------------------------

  const successfulUploads =
    entries.filter(
      (entry) =>
        entry.action ===
        'UPLOAD',
    ).length;

  const alreadyExists =
    entries.filter(
      (entry) =>
        entry.action ===
        'SKIP_ALREADY_EXISTS',
    ).length;

  const duplicateBlocked =
    entries.filter(
      (entry) =>
        entry.action ===
        'BLOCK_DUPLICATE',
    ).length;

  const missingFromVault =
    entries.filter(
      (entry) =>
        entry.action ===
        'BLOCK_MISSING_FROM_VAULT',
    ).length;

  const uploadFailures =
    entries.filter(
      (entry) =>
        entry.action ===
        'UPLOAD_FAILED',
    ).length;

  const unknownResults =
    entries.filter(
      (entry) =>
        entry.action ===
        'UPLOAD_UNKNOWN',
    ).length;

  console.log(
    'AUDIT SUMMARY',
  );

  console.log(
    '----------------------------------------',
  );

  console.log(
    `Total audit events: ${entries.length}`,
  );

  console.log(
    `Successful uploads: ${successfulUploads}`,
  );

  console.log(
    `Already existed: ${alreadyExists}`,
  );

  console.log(
    `Duplicate blocked: ${duplicateBlocked}`,
  );

  console.log(
    `Missing from Vault: ${missingFromVault}`,
  );

  console.log(
    `Upload failures: ${uploadFailures}`,
  );

  console.log(
    `Unknown results: ${unknownResults}`,
  );

  console.log(
    '----------------------------------------',
  );

  // -----------------------------------------
  // Detailed audit history
  // -----------------------------------------

  entries.forEach(
    (
      entry,
      index,
    ) => {
      console.log(
        `${index + 1}. ${entry.fileName}`,
      );

      console.log(
        `   Time: ${entry.timestamp}`,
      );

      console.log(
        `   Previous status: ${entry.previousStatus}`,
      );

      console.log(
        `   Vault before: ${entry.vaultMatchesBefore}`,
      );

      console.log(
        `   Action: ${entry.action}`,
      );

      console.log(
        `   Vault after: ${
          entry.vaultMatchesAfter ??
          'N/A'
        }`,
      );

      console.log(
        `   Final status: ${entry.finalStatus}`,
      );

      if (entry.message) {
        console.log(
          `   Message: ${entry.message}`,
        );
      }

      console.log(
        '----------------------------------------',
      );
    },
  );

  console.log(
    'AUDIT INSPECTION COMPLETE',
  );

  console.log(
    '========================================',
  );
});