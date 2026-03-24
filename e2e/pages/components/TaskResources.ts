import type { Page, Locator } from '@playwright/test';

export class TaskResources {
  readonly page: Page;
  readonly container: Locator;
  readonly resourceItems: Locator;
  readonly addButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-testid="task-resources"]');
    this.resourceItems = this.container.locator('[data-testid="resource-item"]');
    this.addButton = this.container.getByRole('button', { name: /add|attach/i });
  }
}
