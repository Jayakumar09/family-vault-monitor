import { test } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

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

test('Inspect Family Vault Monitor status', async ({
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
  // Count local ToUpload documents
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

  // -----------------------------------------
  // Verify Family Vault
  // -----------------------------------------

  await vaultPage.verifyVaultLoaded();

  // -----------------------------------------
  // Get live Family Vault count
  // -----------------------------------------

  const currentVaultDocumentCount =
    await vaultPage.getDocumentCount();

  // -----------------------------------------
  // Report
  // -----------------------------------------

  console.log('========================================');

  console.log(
    'FAMILY VAULT MONITOR STATUS',
  );

  console.log('========================================');

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
    'TOUPLOAD',
  );

  console.log(
    '----------------------------------------',
  );

  console.log(
    `Documents in ToUpload: ${
      toUploadFiles.length
    }`,
  );

  console.log(
    '----------------------------------------',
  );

  console.log(
    'MONITOR ACTIVITY',
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
    'AUDIT HISTORY',
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
    'LAST MONITOR UPLOAD',
  );

  console.log(
    '----------------------------------------',
  );

  if (
    uploadSummary.lastUpload
  ) {
    console.log(
      `File: ${
        uploadSummary.lastUpload.fileName
      }`,
    );

    console.log(
      `Time: ${
        uploadSummary.lastUpload.uploadedAt
      }`,
    );
  } else {
    console.log(
      'No uploads recorded.',
    );
  }

  console.log(
    '----------------------------------------',
  );

  console.log(
    'MONITOR STATUS INSPECTION COMPLETE',
  );

  console.log(
    '========================================',
  );
});