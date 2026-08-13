import { Page, expect, Locator } from '@playwright/test';

export class VaultPage {
  private readonly loginPasswordInput: Locator;
  private readonly loginButton: Locator;
  private readonly signOutButton: Locator;
  private readonly vaultHeading: Locator;
  private readonly uploadDocumentButton: Locator;
  private readonly uploadDialog: Locator;
  private readonly fileInput: Locator;
  private readonly uploadButton: Locator;
  private readonly closeButton: Locator;

  constructor(private readonly page: Page) {
    this.loginPasswordInput = page.locator('#password');

    this.loginButton = page.getByRole('button', {
      name: 'Sign In',
    });

    this.signOutButton = page.getByRole('button', {
      name: 'Sign out',
    });

    this.vaultHeading = page.getByText('Your Vault', {
      exact: true,
    });

    this.uploadDocumentButton = page.getByRole('button', {
      name: /upload document/i,
    });

    this.uploadDialog = page.getByRole('dialog');

    this.fileInput = page.locator(
      'input[type="file"]',
    );

    this.uploadButton = this.uploadDialog.getByRole('button', {
      name: 'Upload',
      exact: true,
    });

    this.closeButton = this.uploadDialog.getByRole('button', {
      name: 'Close',
      exact: true,
    });
  }

  async verifyVaultLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login$/);

    await expect(this.loginPasswordInput).not.toBeVisible();
    await expect(this.loginButton).not.toBeVisible();

    await expect(this.signOutButton).toBeVisible();
    await expect(this.vaultHeading).toBeVisible();
  }

        async getDocumentCount(): Promise<number> {
        const documentSummary = this.page.getByText(
            /documents?\s+secured/i,
        ).first();

        await expect(documentSummary).toBeVisible({
            timeout: 15000,
        });

        // Give the Vault time to finish loading document data.
        await this.page.waitForTimeout(1000);

        const pageText = await this.page.locator('body').innerText();

        const match = pageText.match(
            /(\d+)\s+documents?\s+secured/i,
        );

        if (!match) {
            throw new Error(
            'Unable to determine the total document count from the Vault page.',
            );
        }

        return Number(match[1]);
        }

  async openUploadDialog(): Promise<void> {
    await this.uploadDocumentButton.click();

    await expect(this.uploadDialog).toBeVisible();
    await expect(this.fileInput).toBeAttached();
  }

  async uploadTestDocument(
    filePath: string,
  ): Promise<void> {
    await this.openUploadDialog();

    await this.fileInput.setInputFiles(filePath);

    await expect(this.uploadButton).toBeVisible();

    await this.uploadButton.click();

    await expect(this.uploadDialog).not.toBeVisible({
      timeout: 30000,
    });
  }

  async verifyDocumentPresent(
    fileName: string,
  ): Promise<void> {
    await expect(
      this.page.getByText(fileName, {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 30000,
    });
  }

  async logout(): Promise<number> {
    const startTime = Date.now();

    await this.signOutButton.click();

    await this.page.waitForURL(
      (url) => url.pathname.endsWith('/login'),
      {
        timeout: 15000,
      },
    );

    return Date.now() - startTime;
  }

  async getPageText(): Promise<string> {
    return this.page.locator('body').innerText();
  }
}