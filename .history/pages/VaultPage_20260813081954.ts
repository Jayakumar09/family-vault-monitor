import { Page, expect } from '@playwright/test';

export class VaultPage {
  constructor(private readonly page: Page) {}

  async verifyVaultLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login$/);

    await expect(this.page.locator('body')).toBeVisible();
  }

  async getPageText(): Promise<string> {
    return this.page.locator('body').innerText();
  }
}