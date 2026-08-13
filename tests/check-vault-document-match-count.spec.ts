import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test('Check exact Family Vault document match count', async ({
  page,
}) => {
  const loginPage = new LoginPage(page);
  const vaultPage = new VaultPage(page);

  const testFileName =
    'Passport (front).pdf';

  console.log('========================================');
  console.log('VAULT DOCUMENT MATCH COUNT');
  console.log('========================================');
  console.log(
    `Document: ${testFileName}`,
  );
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
  // Step 3: Count exact matches
  // -----------------------------------------

  const matchCount =
    await vaultPage.getDocumentMatchCount(
      testFileName,
    );

  console.log(
    `Exact Vault matches: ${matchCount}`,
  );

  expect(
    matchCount,
    'Unable to determine Vault document match count',
  ).toBeGreaterThanOrEqual(0);

  // -----------------------------------------
  // Result
  // -----------------------------------------

  if (matchCount === 0) {
    console.log(
      'Result: NOT CURRENTLY IN VAULT',
    );
  } else if (matchCount === 1) {
    console.log(
      'Result: EXACTLY ONE COPY IN VAULT',
    );
  } else {
    console.log(
      `Result: DUPLICATE — ${matchCount} COPIES IN VAULT`,
    );
  }

  console.log('========================================');
});