import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { chromium } from 'playwright';
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

async function processDocument(
  fileName: string,
  state: UploadState,
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
  // Already uploaded / already known
  // -----------------------------------------

  if (
    currentState.status ===
      'UPLOADED' ||
    currentState.status ===
      'ALREADY_EXISTS'
  ) {
    if (existingCount === 1) {
      state[fileName] = {
        ...currentState,
        status: 'ALREADY_EXISTS',
      };

      await saveUploadState(state);

      console.log(
        'Action: SKIP — document already exists',
      );

      return;
    }

    if (existingCount > 1) {
      state[fileName] = {
        ...currentState,
        status: 'DUPLICATE_DETECTED',
      };

      await saveUploadState(state);

      console.log(
        'Action: BLOCKED — duplicate documents detected',
      );

      return;
    }

    state[fileName] = {
      ...currentState,
      status: 'MISSING_FROM_VAULT',
    };

    await saveUploadState(state);

    console.log(
      'Action: BLOCKED — previously uploaded document is missing',
    );

    return;
  }

  // -----------------------------------------
  // New document but Vault already contains it
  // -----------------------------------------

  if (existingCount === 1) {
    state[fileName] = {
      ...currentState,
      status: 'ALREADY_EXISTS',
    };

    await saveUploadState(state);

    console.log(
      'Action: SKIP — matching document already exists',
    );

    return;
  }

  // -----------------------------------------
  // Duplicate condition
  // -----------------------------------------

  if (existingCount > 1) {
    state[fileName] = {
      ...currentState,
      status: 'DUPLICATE_DETECTED',
    };

    await saveUploadState(state);

    console.log(
      'Action: BLOCKED — duplicate documents detected',
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

  await saveUploadState(state);

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

    await saveUploadState(state);

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

  if (postUploadCount === 1) {
    state[fileName] = {
      ...state[fileName],
      status: 'UPLOADED',
      uploadedAt:
        new Date().toISOString(),
    };

    await saveUploadState(state);

    console.log(
      'Final status: UPLOADED',
    );

    return;
  }

  if (postUploadCount > 1) {
    state[fileName] = {
      ...state[fileName],
      status: 'DUPLICATE_DETECTED',
    };

    await saveUploadState(state);

    console.error(
      'Final status: DUPLICATE_DETECTED',
    );

    return;
  }

  state[fileName] = {
    ...state[fileName],
    status: 'UPLOAD_UNKNOWN',
  };

  await saveUploadState(state);

  console.error(
    'Final status: UPLOAD_UNKNOWN',
  );
}

async function main(): Promise<void> {
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

  const inspection =
    await inspectToUpload(state);

  console.log(
    `Documents detected: ${
      inspection.newFiles.length
    } new, ${
      inspection.changedFiles.length
    } changed`,
  );

  if (
    inspection.newFiles.length === 0 &&
    inspection.changedFiles.length === 0
  ) {
    console.log(
      'No new or changed documents.',
    );

    console.log('========================================');

    return;
  }

  const browser =
    await chromium.launch({
      headless: false,
    });

  const page =
    await browser.newPage();

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

    const filesToProcess =
      [
        ...inspection.newFiles,
        ...inspection.changedFiles,
      ];

    for (
      const fileName of filesToProcess
    ) {
      await processDocument(
        fileName,
        state,
        vaultPage,
      );
    }

    console.log('----------------------------------------');
    console.log(
      'TOUPLOAD WATCHER CYCLE: COMPLETE',
    );
    console.log('========================================');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('========================================');
  console.error('TOUPLOAD WATCHER: FAILED');
  console.error(error);
  console.error('========================================');

  process.exitCode = 1;
});