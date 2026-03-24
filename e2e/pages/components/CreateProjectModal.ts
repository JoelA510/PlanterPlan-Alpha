import type { Page, Locator } from '@playwright/test';

export class CreateProjectModal {
  readonly page: Page;
  readonly dialog: Locator;
  readonly templateCards: Locator;
  readonly searchInput: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly continueButton: Locator;
  readonly backButton: Locator;
  readonly createButton: Locator;
  readonly scratchOption: Locator;
  readonly noResultsMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[role="dialog"]');
    this.templateCards = page.locator('[data-testid="template-card"]');
    this.searchInput = page.locator('[role="dialog"]').getByPlaceholder(/search/i);
    this.titleInput = page.locator('[role="dialog"]').getByLabel(/title|name/i);
    this.descriptionInput = page.locator('[role="dialog"]').getByLabel(/description/i);
    this.continueButton = page.getByRole('button', { name: /continue/i });
    this.backButton = page.locator('[role="dialog"]').getByRole('button', { name: /back/i });
    this.createButton = page.getByRole('button', { name: /create project/i });
    this.scratchOption = page.getByText(/start from scratch/i);
    this.noResultsMessage = page.getByText(/no templates|no results/i);
  }

  async selectTemplate(templateText: string) {
    await this.templateCards.filter({ hasText: templateText }).click();
  }

  async selectScratch() {
    await this.scratchOption.click();
  }

  async searchTemplates(query: string) {
    await this.searchInput.fill(query);
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title);
  }

  async fillDescription(desc: string) {
    await this.descriptionInput.fill(desc);
  }

  async clickContinue() {
    await this.continueButton.click();
  }

  async clickBack() {
    await this.backButton.click();
  }

  async clickCreate() {
    await this.createButton.click();
  }
}
