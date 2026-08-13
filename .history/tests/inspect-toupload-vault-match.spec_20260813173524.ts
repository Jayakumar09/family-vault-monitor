import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Inspect whether ToUpload document already exists in Family Vault', async ({
  page,
}) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  const testFileName =  'Canara Bank-jayakumar.pdf';

  console.log('========================================');
  console.log('TOUPLOAD → FAMILY VAULT MATCH INSPECTION');
  console.log('========================================');
  console.log(`Document: ${testFileName}`);
  console.log('----------------------------------------');

  // -----------------------------------------
  // Step 1: Login
  // -----------------------------------------

  await loginPage.open();

  await loginPage.login(
    testConfig.testEmail,
    testConfig.testPassword,
  );

  console.log('Login: PASS');

  // -----------------------------------------
  // Step 2: Verify Vault
  // -----------------------------------------

  await vaultPage.verifyVaultLoaded();

  console.log('Vault: PASS');

  // -----------------------------------------
  // Step 3: Check document count
  // -----------------------------------------

  const documentCount =
    await vaultPage.getDocumentCount();

  console.log(
    `Documents currently in Vault: ${documentCount}`,
  );

  // -----------------------------------------
  // Step 4: Check exact filename
  // -----------------------------------------

  const document =
    page.getByText(
      testFileName,
      {
        exact: true,
      },
    );

  const matchingCount =
    await document.count();

  console.log(
    `Exact filename matches: ${matchingCount}`,
  );

  if (matchingCount > 0) {
    await expect(document.first()).toBeVisible();

    console.log(
      `Family Vault match: EXISTS — ${testFileName}`,
    );
  } else {
    console.log(
      `Family Vault match: NOT FOUND — ${testFileName}`,
    );
  }

  console.log('----------------------------------------');
  console.log('DUPLICATE INSPECTION COMPLETE');
  console.log('----------------------------------------');
});