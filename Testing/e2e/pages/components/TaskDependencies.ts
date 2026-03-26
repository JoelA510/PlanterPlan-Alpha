import type { Page, Locator } from '@playwright/test';

export class TaskDependencies {
  readonly page: Page;
  readonly container: Locator;
  readonly dependencyItems: Locator;
  readonly lockedIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-testid="task-dependencies"]');
    this.dependencyItems = this.container.locator('[data-testid="dependency-item"]');
    this.lockedIndicator = page.locator('[data-testid="locked-indicator"]');
  }
}
