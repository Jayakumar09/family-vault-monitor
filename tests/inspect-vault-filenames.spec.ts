import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';

test(
  'Inspect Family Vault document filenames',
  async ({ page }) => {
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

    const fileNames =
      await vaultPage.getDocumentFileNames();

    console.log(
      '========================================',
    );

    console.log(
      'FAMILY VAULT DOCUMENT FILENAMES',
    );

    console.log(
      '========================================',
    );

    for (
      const fileName of fileNames
    ) {
      console.log(
        fileName,
      );
    }

    console.log(
      '----------------------------------------',
    );

    console.log(
      `Total filenames found: ${fileNames.length}`,
    );

    console.log(
      '========================================',
    );
  },
);