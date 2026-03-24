import type { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly toggleModeButton: Locator;
  readonly autoLoginButton: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('button[type="submit"]');
    this.toggleModeButton = page.getByText(/Already have an account|Need an account/);
    this.autoLoginButton = page.getByText('(Auto-Login as Test User)');
    this.emailError = page.locator('#email ~ p.text-red-500');
    this.passwordError = page.locator('#password ~ p.text-red-500');
    this.heading = page.getByText('PlanterPlan');
    this.subtitle = page.locator('p.text-center.text-sm');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickSignIn() {
    await this.submitButton.click();
  }

  async clickSignUp() {
    await this.submitButton.click();
  }

  async clickAutoLogin() {
    await this.autoLoginButton.click();
  }

  async toggleSignUpMode() {
    await this.toggleModeButton.click();
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSignIn();
  }

  async getValidationError(field: 'email' | 'password') {
    return field === 'email' ? this.emailError : this.passwordError;
  }
}
