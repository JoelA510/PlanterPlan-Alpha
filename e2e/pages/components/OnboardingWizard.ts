import type { Page, Locator } from '@playwright/test';

export class OnboardingWizard {
  readonly page: Page;
  readonly dialog: Locator;
  readonly nameInput: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly skipButton: Locator;
  readonly closeButton: Locator;
  readonly createButton: Locator;
  readonly datePicker: Locator;
  readonly templateOptions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[role="dialog"]');
    this.nameInput = page.getByPlaceholder(/church name|project name/i);
    this.nextButton = page.getByRole('button', { name: /next|continue/i });
    this.backButton = page.getByRole('button', { name: /back/i });
    this.skipButton = page.getByRole('button', { name: /skip/i });
    this.closeButton = page.locator('[role="dialog"] button').filter({ has: page.locator('svg') }).first();
    this.createButton = page.getByRole('button', { name: /create project/i });
    this.datePicker = page.locator('[data-testid="date-picker"], button:has-text("Pick a date")');
    this.templateOptions = page.locator('[role="radiogroup"] [role="radio"]');
  }

  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async clickNext() {
    await this.nextButton.click();
  }

  async clickBack() {
    await this.backButton.click();
  }

  async clickSkip() {
    await this.skipButton.click();
  }

  async clickClose() {
    await this.closeButton.click();
  }

  async clickCreate() {
    await this.createButton.click();
  }

  async selectTemplate(index: number) {
    await this.templateOptions.nth(index).click();
  }
}
