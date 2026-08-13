import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  private emailInput = this.page.getByLabel('Email');
  private passwordInput = this.page.getByLabel('Password');
  private signInButton = this.page.getByRole('button', {
    name: 'Sign In',
  });

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