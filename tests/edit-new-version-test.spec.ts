import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { VaultPage } from '../pages/VaultPage';
import { testConfig } from '../config/test-config';
import path from 'path';

test(
  'Family Vault - Save document as new version',
  async ({ page }) => {
    const loginPage =
      new LoginPage(page);

    const vaultPage =
      new VaultPage(page);

    const testFileName =
      'FamilyVault_Test_01.txt';

    const versionFileName =
      'FamilyVault_Test_01_v2.txt';

    const filePath =
      path.resolve(
        process.cwd(),
        testFileName,
      );

    let baseDocumentCreated =
      false;

    console.log(
      '========================================',
    );

    console.log(
      'EDIT / NEW VERSION TEST',
    );

    console.log(
      '========================================',
    );

    console.log(
      `Base document: ${testFileName}`,
    );

    console.log(
      `Expected version: ${versionFileName}`,
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
    // Step 3: Capture Vault baseline
    // -----------------------------------------

    const initialVaultCount =
      await vaultPage.getDocumentCount();

    console.log(
      `Initial Vault documents: ${initialVaultCount}`,
    );

    // -----------------------------------------
    // Step 4: Ensure exactly one base document
    // -----------------------------------------

    let baseMatchCount =
      await vaultPage.getDocumentMatchCount(
        testFileName,
      );

    console.log(
      `Base document matches before setup: ${baseMatchCount}`,
    );

    if (baseMatchCount === 0) {
      console.log(
        'Base document not found — uploading fixture...',
      );

      await vaultPage.uploadTestDocument(
        filePath,
      );

      baseDocumentCreated = true;

      console.log(
        'Base document upload: PASS',
      );

      await vaultPage.verifyDocumentPresent(
        testFileName,
      );

      await page.waitForTimeout(1000);

      baseMatchCount =
        await vaultPage.getDocumentMatchCount(
          testFileName,
        );

      console.log(
        `Base document matches after setup: ${baseMatchCount}`,
      );
    }

    expect(
      baseMatchCount,
      `Expected exactly one base document, found ${baseMatchCount}`,
    ).toBe(1);

    console.log(
      'Exactly one base document exists: PASS',
    );

    // -----------------------------------------
    // Step 5: Ensure old version artifact is absent
    // -----------------------------------------

    const existingVersionCount =
      await vaultPage.getDocumentMatchCount(
        versionFileName,
      );

    console.log(
      `Version document matches before edit: ${existingVersionCount}`,
    );

    expect(
      existingVersionCount,
      `Old version artifact already exists: ${versionFileName}`,
    ).toBe(0);

    console.log(
      'Version artifact does not already exist: PASS',
    );

    // -----------------------------------------
    // Step 6: Open base document action menu
    // -----------------------------------------

    const document =
      page.getByText(
        testFileName,
        {
          exact: true,
        },
      );

    await expect(
      document,
    ).toBeVisible();

    const documentContainer =
      document.locator(
        'xpath=ancestor::*[.//button][1]',
      );

    const actionButton =
      documentContainer.getByRole(
        'button',
      );

    await expect(
      actionButton,
    ).toHaveCount(1);

    await actionButton.click();

    // -----------------------------------------
    // Step 7: Open Edit
    // -----------------------------------------

    const editMenuItem =
      page.getByRole(
        'menuitem',
        {
          name: 'Edit (save as new version)',
          exact: true,
        },
      );

    await expect(
      editMenuItem,
    ).toBeVisible();

    await editMenuItem.click();

    const editDialog =
      page.getByRole('dialog');

    await expect(
      editDialog,
    ).toBeVisible();

    // -----------------------------------------
    // Step 8: Wait for file content
    // -----------------------------------------

    await page.waitForTimeout(2000);

    const textareas =
      editDialog.locator(
        'textarea:visible',
      );

    await expect(
      textareas,
    ).toHaveCount(2);

    const fileContent =
      textareas.nth(0);

    const originalContent =
      await fileContent.inputValue();

    console.log(
      `Original content: ${originalContent.trim()}`,
    );

    // -----------------------------------------
    // Step 9: Make controlled change
    // -----------------------------------------

    const newContent =
      `${originalContent.trimEnd()}\nVersion 2 test`;

    await fileContent.fill(
      newContent,
    );

    console.log(
      'File content modification: PASS',
    );

    // -----------------------------------------
    // Step 10: Save as new version
    // -----------------------------------------

    const saveVersionButton =
      editDialog.getByRole(
        'button',
        {
          name: 'Save as new version',
          exact: true,
        },
      );

    await expect(
      saveVersionButton,
    ).toBeVisible();

    await saveVersionButton.click();

    console.log(
      'Save as new version: CLICKED',
    );

    await expect(
      editDialog,
    ).not.toBeVisible({
      timeout: 30000,
    });

    await page.waitForTimeout(2000);

    // -----------------------------------------
    // Step 11: Verify base document remains
    // -----------------------------------------

    await vaultPage.verifyDocumentPresent(
      testFileName,
    );

    console.log(
      `Base document remains: ${testFileName} — PASS`,
    );

    // -----------------------------------------
    // Step 12: Verify version document exists
    // -----------------------------------------

    const versionMatchCount =
      await vaultPage.getDocumentMatchCount(
        versionFileName,
      );

    console.log(
      `Version document matches after edit: ${versionMatchCount}`,
    );

    expect(
      versionMatchCount,
      `Expected exactly one version document: ${versionFileName}`,
    ).toBe(1);

    console.log(
      'Exactly one new version exists: PASS',
    );

    // -----------------------------------------
    // Step 13: Verify Vault count increased by one
    // -----------------------------------------

    const afterVersionCount =
      await vaultPage.getDocumentCount();

    console.log(
      `Documents after versioning: ${afterVersionCount}`,
    );

    expect(
      afterVersionCount,
      'Document count did not increase by exactly one after creating new version',
    ).toBe(
      initialVaultCount + 1,
    );

    console.log(
      `Document count: ${initialVaultCount} → ${afterVersionCount} — PASS`,
    );

    // -----------------------------------------
    // Step 14: Cleanup only created version
    // -----------------------------------------

    await vaultPage.deleteTestDocument(
      versionFileName,
    );

    console.log(
      `Version cleanup: ${versionFileName} — PASS`,
    );

    await page.waitForTimeout(1000);

    // -----------------------------------------
    // Step 15: Verify version removed
    // -----------------------------------------

    const afterCleanupVersionCount =
      await vaultPage.getDocumentMatchCount(
        versionFileName,
      );

    console.log(
      `Version matches after cleanup: ${afterCleanupVersionCount}`,
    );

    expect(
      afterCleanupVersionCount,
      `${versionFileName} still exists after cleanup`,
    ).toBe(0);

    console.log(
      'Created version removed: PASS',
    );

    // -----------------------------------------
    // Step 16: Verify base document remains
    // -----------------------------------------

    const finalBaseMatchCount =
      await vaultPage.getDocumentMatchCount(
        testFileName,
      );

    expect(
      finalBaseMatchCount,
      'Base document was removed during version cleanup',
    ).toBe(1);

    console.log(
      'Base document preserved: PASS',
    );

    // -----------------------------------------
    // Step 17: Verify Vault restored
    // -----------------------------------------

    const finalVaultCount =
      await vaultPage.getDocumentCount();

    console.log(
      `Documents after cleanup: ${finalVaultCount}`,
    );

    expect(
      finalVaultCount,
      'Vault did not return to its initial document count',
    ).toBe(
      initialVaultCount,
    );

    console.log(
      `Cleanup count: ${afterVersionCount} → ${finalVaultCount} — PASS`,
    );

    // -----------------------------------------
    // Step 18: Cleanup base document if test created it
    // -----------------------------------------

    if (baseDocumentCreated) {
      await vaultPage.deleteTestDocument(
        testFileName,
      );

      console.log(
        `Test-created base document cleanup: ${testFileName} — PASS`,
      );

      await page.waitForTimeout(1000);

      const afterBaseCleanupCount =
        await vaultPage.getDocumentMatchCount(
          testFileName,
        );

      expect(
        afterBaseCleanupCount,
        `${testFileName} still exists after final cleanup`,
      ).toBe(0);

      const finalCleanVaultCount =
        await vaultPage.getDocumentCount();

      expect(
        finalCleanVaultCount,
        'Vault did not return to its original count after final cleanup',
      ).toBe(
        initialVaultCount,
      );

      console.log(
        `Final Vault count: ${finalCleanVaultCount} — PASS`,
      );
    }

    // -----------------------------------------
    // Final status
    // -----------------------------------------

    console.log(
      '----------------------------------------',
    );

    console.log(
      'New version creation: PASS',
    );

    console.log(
      'New version verification: PASS',
    );

    console.log(
      'Created version cleanup: PASS',
    );

    console.log(
      'Base document preserved: PASS',
    );

    console.log(
      'Vault baseline restored: PASS',
    );

    console.log(
      'NEW VERSION TEST: HEALTHY',
    );

    console.log(
      '----------------------------------------',
    );
  },
);