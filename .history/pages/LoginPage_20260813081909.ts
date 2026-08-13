import { Page, expect, Locator } from '@playwright/test';

export class LoginPage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly signInButton: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.signInButton = page.getByRole('button', {
      name: 'Sign In',
    });
  }

  async open(): Promise<void> {
    await this.page.goto('/login');
  }

  async verifyLoginPage(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.signInButton).toBeVisible();
  }

  async login(email: string, password: string): Promise<number> {
    const startTime = Date.now();

    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    await this.signInButton.click();

    await this.page.waitForURL(
      (url) => !url.pathname.endsWith('/login'),
      {
        timeout: 15000,
      },
    );

    return Date.now() - startTime;
  }
}