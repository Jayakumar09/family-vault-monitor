import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

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

async function calculateSha256(
  filePath: string,
): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);

  return crypto
    .createHash('sha256')
    .update(fileBuffer)
    .digest('hex');
}

test('Inspect ToUpload document lifecycle state', async () => {
  const toUploadDirectory = path.resolve(
    process.cwd(),
    'ToUpload',
  );

  const statusDirectory = path.resolve(
    process.cwd(),
    'UploadStatus',
  );

  const stateFilePath = path.join(
    statusDirectory,
    'toupload-state.json',
  );

  await fs.mkdir(
    toUploadDirectory,
    {
      recursive: true,
    },
  );

  await fs.mkdir(
    statusDirectory,
    {
      recursive: true,
    },
  );

  // -----------------------------------------
  // Load previous state
  // -----------------------------------------

  let previousState: UploadState = {};

  try {
    const stateContent =
      await fs.readFile(
        stateFilePath,
        'utf8',
      );

    previousState =
      JSON.parse(stateContent) as UploadState;
  } catch {
    previousState = {};
  }

  // -----------------------------------------
  // Scan ToUpload
  // -----------------------------------------

  const entries = await fs.readdir(
    toUploadDirectory,
    {
      withFileTypes: true,
    },
  );

  const files = entries.filter(
    (entry) => entry.isFile(),
  );

  const currentState: UploadState = {};

  let newCount = 0;
  let unchangedCount = 0;
  let changedCount = 0;

  console.log('========================================');
  console.log('TOUPLOAD LIFECYCLE INSPECTION');
  console.log('========================================');
  console.log(
    `ToUpload folder: ${toUploadDirectory}`,
  );
  console.log(
    `Document count: ${files.length}`,
  );

  // -----------------------------------------
  // Inspect each file
  // -----------------------------------------

  for (const file of files) {
    const fileName = file.name;

    const filePath = path.join(
      toUploadDirectory,
      fileName,
    );

    const stats = await fs.stat(filePath);

    const sha256 =
      await calculateSha256(filePath);

    const previous =
      previousState[fileName];

    // -----------------------------------------
    // Completely new file
    // -----------------------------------------

    if (!previous) {
      const state: FileState = {
        size: stats.size,
        modifiedTimeMs: stats.mtimeMs,
        sha256,
        status: 'DETECTED',
        detectedAt: new Date().toISOString(),
      };

      currentState[fileName] = state;

      newCount++;

      console.log(
        `NEW DOCUMENT: ${fileName}`,
      );

      console.log(
        `  Size: ${stats.size} bytes`,
      );

      console.log(
        `  SHA-256: ${sha256}`,
      );

      console.log(
        '  Lifecycle status: DETECTED',
      );

      continue;
    }

    // -----------------------------------------
    // Same file as previous scan
    // -----------------------------------------

    if (
      previous.sha256 === sha256 &&
      previous.size === stats.size
    ) {
      currentState[fileName] = {
        ...previous,
        modifiedTimeMs: stats.mtimeMs,
      };

      unchangedCount++;

      console.log(
        `EXISTING DOCUMENT: ${fileName}`,
      );

      console.log(
        `  Previous status: ${previous.status}`,
      );

      console.log(
        `  SHA-256: ${sha256}`,
      );

      continue;
    }

    // -----------------------------------------
    // Same filename but changed contents
    // -----------------------------------------

    const changedState: FileState = {
      size: stats.size,
      modifiedTimeMs: stats.mtimeMs,
      sha256,
      status: 'DETECTED',
      detectedAt: new Date().toISOString(),
    };

    currentState[fileName] =
      changedState;

    changedCount++;

    console.log(
      `CHANGED DOCUMENT: ${fileName}`,
    );

    console.log(
      `  Previous SHA-256: ${previous.sha256}`,
    );

    console.log(
      `  Current SHA-256: ${sha256}`,
    );

    console.log(
      `  Previous status: ${previous.status}`,
    );

    console.log(
      '  Lifecycle status: DETECTED',
    );
  }

  // -----------------------------------------
  // Save state
  // -----------------------------------------

  await fs.writeFile(
    stateFilePath,
    JSON.stringify(
      currentState,
      null,
      2,
    ),
    'utf8',
  );

  console.log('----------------------------------------');
  console.log(
    `New documents: ${newCount}`,
  );
  console.log(
    `Changed documents: ${changedCount}`,
  );
  console.log(
    `Existing documents: ${unchangedCount}`,
  );
  console.log(
    `State saved: ${stateFilePath}`,
  );
  console.log('========================================');

  expect(
    files,
    'Unable to read ToUpload folder',
  ).toBeDefined();
});