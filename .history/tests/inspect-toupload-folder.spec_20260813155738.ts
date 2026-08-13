import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

type FileState = {
  size: number;
  modifiedTimeMs: number;
  sha256: string;
  status: 'DETECTED';
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

test('Detect new and changed documents in ToUpload folder', async () => {
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
  // Scan ToUpload folder
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

  console.log('========================================');
  console.log('TOUPLOAD NEW DOCUMENT DETECTION');
  console.log('========================================');
  console.log(
    `ToUpload folder: ${toUploadDirectory}`,
  );
  console.log(
    `Document count: ${files.length}`,
  );

  const currentState: UploadState = {};

  let newCount = 0;
  let unchangedCount = 0;
  let changedCount = 0;

  // -----------------------------------------
  // Inspect each document
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

    const fileState: FileState = {
      size: stats.size,
      modifiedTimeMs: stats.mtimeMs,
      sha256,
      status: 'DETECTED',
    };

    currentState[fileName] =
      fileState;

    // -----------------------------------------
    // New document
    // -----------------------------------------

    if (!previous) {
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

      continue;
    }

    // -----------------------------------------
    // Changed document
    // -----------------------------------------

    if (
      previous.sha256 !== sha256 ||
      previous.size !== stats.size
    ) {
      changedCount++;

      console.log(
        `CHANGED DOCUMENT: ${fileName}`,
      );

      console.log(
        `  Previous size: ${previous.size} bytes`,
      );

      console.log(
        `  Current size: ${stats.size} bytes`,
      );

      console.log(
        `  Previous SHA-256: ${previous.sha256}`,
      );

      console.log(
        `  Current SHA-256: ${sha256}`,
      );

      continue;
    }

    // -----------------------------------------
    // Already known
    // -----------------------------------------

    unchangedCount++;

    console.log(
      `ALREADY SEEN: ${fileName}`,
    );
  }

  // -----------------------------------------
  // Save current state
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
    `Already seen: ${unchangedCount}`,
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