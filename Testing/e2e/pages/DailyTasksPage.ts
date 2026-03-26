import type { Page, Locator } from '@playwright/test';

export class DailyTasksPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly taskItems: Locator;
  readonly taskCount: Locator;
  readonly caughtUpMessage: Locator;
  readonly spinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { level: 1 });
    this.taskItems = page.locator('[data-testid="daily-task-item"]');
    this.taskCount = page.locator('[data-testid="task-count"]');
    this.caughtUpMessage = page.getByText(/all caught up|no tasks due/i);
    this.spinner = page.locator('.animate-spin');
  }

  async goto() {
    await this.page.goto('/daily');
    await this.page.waitForLoadState('networkidle');
  }

  async getDailyTasks() {
    return this.taskItems;
  }

  async getTaskCount() {
    return this.taskCount;
  }
}
