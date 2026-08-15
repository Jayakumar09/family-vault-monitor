import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Cleanup accidental Passport duplicate documents safely', async ({
  page,
}) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  const testFileName =
    'Passport (front).pdf';

  console.log(
    '========================================',
  );

  console.log(
    'PASSPORT DUPLICATE CLEANUP',
  );

  console.log(
    '========================================',
  );

  console.log(
    `Target document: ${testFileName}`,
  );

  console.log(
    '----------------------------------------',
  );

  // -----------------------------------------
  // Step 1: Login
  // -----------------------------------------

  await loginPage.open();

  await loginPage.login(
    testConfig.testEmail,
    testConfig.testPassword,
  );

  console.log(
    'Login: PASS',
  );

  // -----------------------------------------
  // Step 2: Verify Vault
  // -----------------------------------------

  await vaultPage.verifyVaultLoaded();

  console.log(
    'Vault: PASS',
  );

  // -----------------------------------------
  // Step 3: Wait for Vault document data
  // -----------------------------------------

  await page.getByText(
    /documents?\s+secured/i,
  ).first().waitFor({
    state: 'visible',
    timeout: 15000,
  });

  await page.waitForTimeout(1000);

  // -----------------------------------------
  // Step 4: Capture Vault baseline
  // -----------------------------------------

  const initialVaultCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Total Vault documents before cleanup: ${initialVaultCount}`,
  );

  // -----------------------------------------
  // Step 5: Count Passport documents
  // -----------------------------------------

  const passportDocument =
    page.getByText(
      testFileName,
      {
        exact: true,
      },
    );

  const beforeCount =
    await passportDocument.count();

  console.log(
    `Passport documents before cleanup: ${beforeCount}`,
  );

  // -----------------------------------------
  // Step 6: Safe duplicate decision
  // -----------------------------------------

  // No Passport document exists.
  // Nothing should be deleted.
  if (beforeCount === 0) {
    console.log(
      'Passport document not currently in Vault — cleanup skipped.',
    );

    console.log(
      'No Passport document deleted: PASS',
    );

    console.log(
      'Vault baseline preserved: PASS',
    );

    const finalVaultCount =
      await vaultPage.getDocumentCount();

    expect(
      finalVaultCount,
      'Vault document count changed unexpectedly when no Passport existed',
    ).toBe(
      initialVaultCount,
    );

    console.log(
      `Vault count: ${initialVaultCount} → ${finalVaultCount} — PASS`,
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      'PASSPORT DUPLICATE CLEANUP: NOT REQUIRED',
    );

    console.log(
      'CLEANUP STATUS: HEALTHY',
    );

    console.log(
      '========================================',
    );

    return;
  }

  // Exactly one Passport document exists.
  // Preserve it because this test is for duplicates.
  if (beforeCount === 1) {
    console.log(
      'Exactly one Passport document exists.',
    );

    console.log(
      'Legitimate Passport copy preserved: PASS',
    );

    const finalVaultCount =
      await vaultPage.getDocumentCount();

    expect(
      finalVaultCount,
      'Vault document count changed while preserving the only Passport copy',
    ).toBe(
      initialVaultCount,
    );

    console.log(
      `Vault count: ${initialVaultCount} → ${finalVaultCount} — PASS`,
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      'NO PASSPORT DUPLICATES DETECTED',
    );

    console.log(
      'CLEANUP STATUS: HEALTHY',
    );

    console.log(
      '========================================',
    );

    return;
  }

  // -----------------------------------------
  // Step 7: Duplicates exist
  // -----------------------------------------

  console.log(
    `Duplicate condition detected: ${beforeCount} Passport copies`,
  );

  console.log(
    'One Passport copy will be preserved.',
  );

  const duplicatesToDelete =
    beforeCount - 1;

  let deletedCount = 0;

  // -----------------------------------------
  // Step 8: Delete only duplicate copies
  // -----------------------------------------

  while (deletedCount < duplicatesToDelete) {
    const currentCount =
      await passportDocument.count();

    // Never delete the final Passport copy.
    if (currentCount <= 1) {
      break;
    }

    console.log(
      `Deleting Passport duplicate ${deletedCount + 1} of ${duplicatesToDelete}...`,
    );

    await vaultPage.deleteTestDocument(
      testFileName,
    );

    deletedCount++;

    console.log(
      `Deleted Passport duplicate ${deletedCount}: PASS`,
    );

    // Safety limit.
    if (deletedCount >= 10) {
      throw new Error(
        'Safety limit reached while deleting Passport duplicates.',
      );
    }

    await page.waitForTimeout(1000);
  }

  // -----------------------------------------
  // Step 9: Verify exactly one remains
  // -----------------------------------------

  const afterCount =
    await passportDocument.count();

  console.log(
    `Passport documents after cleanup: ${afterCount}`,
  );

  expect(
    afterCount,
    'Passport cleanup must preserve exactly one document',
  ).toBe(1);

  // -----------------------------------------
  // Step 10: Verify only duplicates removed
  // -----------------------------------------

  const finalVaultCount =
    await vaultPage.getDocumentCount();

  const expectedFinalVaultCount =
    initialVaultCount -
    deletedCount;

  console.log(
    `Total Vault documents after cleanup: ${finalVaultCount}`,
  );

  console.log(
    `Expected Vault documents after cleanup: ${expectedFinalVaultCount}`,
  );

  expect(
    finalVaultCount,
    'Unexpected Vault document count after Passport duplicate cleanup',
  ).toBe(
    expectedFinalVaultCount,
  );

  // -----------------------------------------
  // Step 11: Final cleanup verification
  // -----------------------------------------

  console.log(
    '----------------------------------------',
  );

  console.log(
    `Passport duplicates deleted: ${deletedCount}`,
  );

  console.log(
    'Exactly one Passport document preserved: PASS',
  );

  console.log(
    `Vault baseline: ${initialVaultCount} documents`,
  );

  console.log(
    `Vault final count: ${finalVaultCount} documents`,
  );

  console.log(
    'Unrelated Vault documents preserved: PASS',
  );

  console.log(
    'CLEANUP STATUS: HEALTHY',
  );

  console.log(
    '========================================',
  );
});