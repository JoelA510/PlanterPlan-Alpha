import type { Page, Locator } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly avatarUrlInput: Locator;
  readonly roleInput: Locator;
  readonly organizationInput: Locator;
  readonly weeklyDigestToggle: Locator;
  readonly saveButton: Locator;
  readonly avatarError: Locator;
  readonly spinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { level: 1 });
    this.fullNameInput = page.getByLabel(/full name/i);
    this.emailInput = page.getByLabel(/email/i);
    this.avatarUrlInput = page.getByLabel(/avatar/i);
    this.roleInput = page.getByLabel(/role/i);
    this.organizationInput = page.getByLabel(/organization|church/i);
    this.weeklyDigestToggle = page.locator('[role="switch"]');
    this.saveButton = page.getByRole('button', { name: /save/i });
    this.avatarError = page.locator('[data-testid="avatar-error"], .text-red-500');
    this.spinner = page.locator('.animate-spin');
  }

  async goto() {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');
  }

  async fillFullName(name: string) {
    await this.fullNameInput.fill(name);
  }

  async fillAvatarUrl(url: string) {
    await this.avatarUrlInput.fill(url);
    await this.avatarUrlInput.blur();
  }

  async fillRole(role: string) {
    await this.roleInput.fill(role);
  }

  async fillOrganization(org: string) {
    await this.organizationInput.fill(org);
  }

  async toggleWeeklyDigest() {
    await this.weeklyDigestToggle.click();
  }

  async clickSave() {
    await this.saveButton.click();
  }

  async getAvatarError() {
    return this.avatarError;
  }

  async getEmailField() {
    return this.emailInput;
  }
}
