import type { Page, Locator } from '@playwright/test';

export class TaskDetailsPanel {
  readonly page: Page;
  readonly panel: Locator;
  readonly title: Locator;
  readonly closeButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly completeButton: Locator;
  readonly statusSelect: Locator;
  readonly description: Locator;
  readonly startDate: Locator;
  readonly dueDate: Locator;
  readonly assignee: Locator;

  constructor(page: Page) {
    this.page = page;
    this.panel = page.locator('[data-testid="task-details-panel"]');
    this.title = this.panel.locator('h2, h3').first();
    this.closeButton = this.panel.getByRole('button', { name: /close/i }).or(this.panel.locator('button:has(svg)').first());
    this.editButton = this.panel.getByRole('button', { name: /edit/i });
    this.deleteButton = this.panel.getByRole('button', { name: /delete/i });
    this.completeButton = this.panel.getByRole('button', { name: /complete/i });
    this.statusSelect = this.panel.locator('[data-testid="status-select"]');
    this.description = this.panel.locator('[data-testid="task-description"]');
    this.startDate = this.panel.locator('[data-testid="start-date"]');
    this.dueDate = this.panel.locator('[data-testid="due-date"]');
    this.assignee = this.panel.locator('[data-testid="assignee"]');
  }

  async close() {
    await this.closeButton.click();
  }

  async clickEdit() {
    await this.editButton.click();
  }

  async clickDelete() {
    await this.deleteButton.click();
  }

  async clickComplete() {
    await this.completeButton.click();
  }
}
