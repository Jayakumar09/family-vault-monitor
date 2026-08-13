import { Page, expect, Locator } from '@playwright/test';

export class VaultPage {
  private readonly loginPasswordInput: Locator;
  private readonly loginButton: Locator;
  private readonly signOutButton: Locator;
  private readonly vaultHeading: Locator;

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
  }

  async verifyVaultLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login$/);

    // Login form must no longer be visible.
    await expect(this.loginPasswordInput).not.toBeVisible();
    await expect(this.loginButton).not.toBeVisible();

    // Authenticated Vault content must be visible.
    await expect(this.signOutButton).toBeVisible();
    await expect(this.vaultHeading).toBeVisible();
  }

  async getDocumentCount(): Promise<number> {
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

  async getPageText(): Promise<string> {
    return this.page.locator('body').innerText();
  }
}