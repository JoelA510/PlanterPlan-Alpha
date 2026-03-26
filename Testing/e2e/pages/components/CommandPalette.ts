import type { Page, Locator } from '@playwright/test';

export class CommandPalette {
  readonly page: Page;
  readonly dialog: Locator;
  readonly input: Locator;
  readonly results: Locator;
  readonly noResults: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[cmdk-dialog]');
    this.input = page.locator('[cmdk-input]');
    this.results = page.locator('[cmdk-item]');
    this.noResults = page.getByText(/no results/i);
  }

  async open() {
    await this.page.keyboard.press('Meta+k');
  }

  async close() {
    await this.page.keyboard.press('Escape');
  }

  async search(query: string) {
    await this.input.fill(query);
  }

  async selectItem(text: string) {
    await this.results.filter({ hasText: text }).click();
  }
}
