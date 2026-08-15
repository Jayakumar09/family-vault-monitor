import { expect } from '@playwright/test';
import path from 'path';
import { VaultPage } from '../../pages/VaultPage';

export const TEST_DOCUMENT_NAME =
  'FamilyVault_Test_01.txt';

export const TEST_DOCUMENT_PATH =
  path.resolve(
    process.cwd(),
    TEST_DOCUMENT_NAME,
  );

export async function ensureTestDocument(
  vaultPage: VaultPage,
): Promise<{
  initialVaultCount: number;
  testDocumentCreated: boolean;
}> {
  // -----------------------------------------
  // Capture Vault baseline
  // -----------------------------------------

  const initialVaultCount =
    await vaultPage.getDocumentCount();

  // -----------------------------------------
  // Check whether test document already exists
  // -----------------------------------------

  const existingCount =
    await vaultPage.getDocumentMatchCount(
      TEST_DOCUMENT_NAME,
    );

  if (existingCount > 1) {
    throw new Error(
      `Expected at most one ${TEST_DOCUMENT_NAME}, but found ${existingCount}.`,
    );
  }

  // -----------------------------------------
  // Create test document only when absent
  // -----------------------------------------

  let testDocumentCreated =
    false;

  if (existingCount === 0) {
    await vaultPage.uploadTestDocument(
      TEST_DOCUMENT_PATH,
    );

    testDocumentCreated = true;

    await vaultPage.verifyDocumentPresent(
      TEST_DOCUMENT_NAME,
    );
  }

  // -----------------------------------------
  // Verify exactly one copy exists
  // -----------------------------------------

  const finalMatchCount =
    await vaultPage.getDocumentMatchCount(
      TEST_DOCUMENT_NAME,
    );

  expect(
    finalMatchCount,
    `Expected exactly one copy of ${TEST_DOCUMENT_NAME}, found ${finalMatchCount}.`,
  ).toBe(1);

  return {
    initialVaultCount,
    testDocumentCreated,
  };
}

export async function cleanupTestDocument(
  vaultPage: VaultPage,
  initialVaultCount: number,
  testDocumentCreated: boolean,
): Promise<void> {
  // -----------------------------------------
  // Do not remove a document that existed
  // before this test started
  // -----------------------------------------

  if (!testDocumentCreated) {
    return;
  }

  // -----------------------------------------
  // Remove test document
  // -----------------------------------------

  const matchCount =
    await vaultPage.getDocumentMatchCount(
      TEST_DOCUMENT_NAME,
    );

  if (matchCount > 0) {
    await vaultPage.deleteTestDocument(
      TEST_DOCUMENT_NAME,
    );
  }

  // -----------------------------------------
  // Verify test document was removed
  // -----------------------------------------

  await expect
    .poll(
      async () =>
        await vaultPage.getDocumentMatchCount(
          TEST_DOCUMENT_NAME,
        ),
      {
        timeout: 30000,
        message:
          `${TEST_DOCUMENT_NAME} was not removed during inspection-test cleanup.`,
      },
    )
    .toBe(0);

  // -----------------------------------------
  // Verify original Vault count restored
  // -----------------------------------------

  const finalVaultCount =
    await vaultPage.getDocumentCount();

  expect(
    finalVaultCount,
    'Vault baseline was not restored after inspection-test cleanup',
  ).toBe(initialVaultCount);
}
