import { Page, expect, Locator } from '@playwright/test';

export class LoginPage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly signInButton: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.locator('#password');
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

    async login(
            email: string,
            password: string,
          ): Promise<number> {
            const startTime = Date.now();

            await this.emailInput.fill(email);
            await this.passwordInput.fill(password);

            await this.signInButton.click();

            // -----------------------------------------
            // Wait for SPA authentication to complete.
            // -----------------------------------------
            //
            // The Family Vault is a SPA. Authentication
            // may complete without a conventional browser
            // navigation event.
            //
            // The reliable transition is:
            // 1. Login form disappears.
            // 2. URL leaves /login.
            // 3. Authenticated Vault heading appears.
            // -----------------------------------------

            await expect(
              this.emailInput,
            ).not.toBeVisible({
              timeout: 15000,
            });

            await expect(
              this.passwordInput,
            ).not.toBeVisible({
              timeout: 15000,
            });

            await expect(
              this.signInButton,
            ).not.toBeVisible({
              timeout: 15000,
            });

            await expect(
              this.page,
            ).not.toHaveURL(/\/login$/, {
              timeout: 15000,
            });

            await expect(
              this.page.getByText('Your Vault', {
                exact: true,
              }),
            ).toBeVisible({
              timeout: 15000,
            });

            return Date.now() - startTime;
          }
}