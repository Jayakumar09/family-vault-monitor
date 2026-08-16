import { test, expect } from '@playwright/test';

import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test(
  'Detect unexpected Family Vault document safely',
  async ({ page }) => {
    const loginPage =
      new LoginPage(page);

    const vaultPage =
      new VaultPage(page);

    // -----------------------------------------
    // Controlled test document
    // -----------------------------------------

    const controlledTestFileName =
      'FamilyVault_Monitor_Test_01.txt';

    console.log('========================================');
    console.log(
      'UNEXPECTED VAULT DOCUMENT SAFETY TEST',
    );
    console.log('========================================');

    console.log(
      `Controlled document: ${
        controlledTestFileName
      }`,
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
    // Step 3: Confirm controlled document
    // exists in the live Vault
    // -----------------------------------------

    const vaultMatchCount =
      await vaultPage.getDocumentMatchCount(
        controlledTestFileName,
      );

    expect(
      vaultMatchCount,
      `Controlled document "${controlledTestFileName}" must exist in the Vault before this test.`,
    ).toBe(1);

    console.log(
      `Controlled document in Vault: ${
        vaultMatchCount
      } match`,
    );

    // -----------------------------------------
    // Step 4: Build an isolated local-state
    // filename set.
    //
    // IMPORTANT:
    // Do NOT modify toupload-state.json.
    // -----------------------------------------

    const isolatedTrackedFileNames = [
      'Canara Bank-jayakumar.pdf',
      'contactsvijayalakshmi.csv',
      'House ft calculation.xlsx',
      'THURAIYUR LAND ANGAMMAL.pdf',
    ].sort();

    console.log(
      `Isolated tracked filenames: ${
        isolatedTrackedFileNames.length
      }`,
    );

    // -----------------------------------------
    // Step 5: Read actual Vault filenames
    // -----------------------------------------

    const actualVaultDocumentFileNames =
      (
        await vaultPage.getDocumentFileNames()
      )
        .map(
          (fileName) =>
            fileName.trim(),
        )
        .filter(
          (fileName) =>
            fileName.length > 0,
        )
        .sort();

    console.log(
      `Actual Vault filenames: ${
        actualVaultDocumentFileNames.length
      }`,
    );

    // -----------------------------------------
    // Step 6: Detect exact filename differences
    // -----------------------------------------

    const missingFromVaultFileNames =
      isolatedTrackedFileNames.filter(
        (fileName) =>
          !actualVaultDocumentFileNames.includes(
            fileName,
          ),
      );

    const unexpectedVaultFileNames =
      actualVaultDocumentFileNames.filter(
        (fileName) =>
          !isolatedTrackedFileNames.includes(
            fileName,
          ),
      );

    // -----------------------------------------
    // Step 7: Verify controlled document is
    // detected as unexpected
    // -----------------------------------------

    expect(
      unexpectedVaultFileNames,
    ).toContain(
      controlledTestFileName,
    );

    console.log('----------------------------------------');

    console.log(
      'UNEXPECTED VAULT DOCUMENTS',
    );

    console.log('----------------------------------------');

    for (
      const fileName of
        unexpectedVaultFileNames
    ) {
      console.log(
        `  ${fileName}`,
      );
    }

    console.log('----------------------------------------');

    console.log(
      `Controlled document detected as unexpected: ${
        unexpectedVaultFileNames.includes(
          controlledTestFileName,
        )
          ? 'PASS'
          : 'FAIL'
      }`,
    );

    // -----------------------------------------
    // Step 8: Verify no missing documents
    // exist in this isolated comparison
    // -----------------------------------------

    expect(
      missingFromVaultFileNames,
    ).toEqual([]);

    console.log(
      'Missing from Vault in isolated comparison: 0',
    );

    console.log('----------------------------------------');

    console.log(
      'UNEXPECTED VAULT DOCUMENT SAFETY TEST: PASS',
    );

    console.log('========================================');
  },
);