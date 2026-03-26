import type { Page, Locator } from '@playwright/test';

export class MobileFAB {
  readonly page: Page;
  readonly fab: Locator;
  readonly dropdown: Locator;
  readonly newProjectOption: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fab = page.locator('[aria-label="Add Task"]');
    this.dropdown = page.locator('[role="menu"]');
    this.newProjectOption = page.getByRole('menuitem', { name: /new project/i });
  }

  async click() {
    await this.fab.click();
  }

  async clickNewProject() {
    await this.click();
    await this.newProjectOption.click();
  }
}
