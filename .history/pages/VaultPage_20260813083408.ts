import { Page, expect, Locator } from '@playwright/test';

export class VaultPage {
  private readonly loginPasswordInput: Locator;
  private readonly loginButton: Locator;

  constructor(private readonly page: Page) {
    this.loginPasswordInput = page.locator('#password');
    this.loginButton = page.getByRole('button', {
      name: 'Sign In',
    });
  }

  async verifyVaultLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login$/);

    // The login form must no longer be visible.
    await expect(this.loginPasswordInput).not.toBeVisible();

    await expect(this.loginButton).not.toBeVisible();
  }

  async getPageText(): Promise<string> {
    return this.page.locator('body').innerText();
  }
}