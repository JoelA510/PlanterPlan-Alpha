import type { Page, Locator } from '@playwright/test';

export class InviteMemberModal {
  readonly page: Page;
  readonly dialog: Locator;
  readonly emailInput: Locator;
  readonly roleSelect: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[role="dialog"]');
    this.emailInput = page.locator('[role="dialog"]').getByPlaceholder(/email|user id/i);
    this.roleSelect = page.locator('[role="dialog"]').locator('select, [role="combobox"]');
    this.submitButton = page.getByRole('button', { name: /send invite|invite/i });
    this.cancelButton = page.locator('[role="dialog"]').getByRole('button', { name: /cancel/i });
    this.successMessage = page.locator('.text-emerald-600, [data-testid="invite-success"]');
    this.errorMessage = page.locator('.text-rose-600, [data-testid="invite-error"]');
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async selectRole(role: string) {
    await this.roleSelect.selectOption(role);
  }

  async submit() {
    await this.submitButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }
}
