import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

test('Inspect ToUpload folder for new documents', async () => {
  const toUploadDirectory = path.resolve(
    process.cwd(),
    'ToUpload',
  );

  await fs.mkdir(
    toUploadDirectory,
    {
      recursive: true,
    },
  );

  const entries = await fs.readdir(
    toUploadDirectory,
    {
      withFileTypes: true,
    },
  );

  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  console.log('========================================');
  console.log('TOUPLOAD FOLDER INSPECTION');
  console.log('========================================');
  console.log(
    `ToUpload folder: ${toUploadDirectory}`,
  );
  console.log(
    `Document count: ${files.length}`,
  );

  if (files.length === 0) {
    console.log('No new documents detected.');
  } else {
    console.log('Documents detected:');

    for (const file of files) {
      console.log(`- ${file}`);
    }
  }

  console.log('========================================');

  expect(
    files,
    'Unable to read ToUpload folder',
  ).toBeDefined();
});