import type { Page, Locator } from '@playwright/test';

export class MilestoneSection {
  readonly page: Page;
  readonly sections: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sections = page.locator('[data-testid="milestone-section"]');
  }

  async toggle(index: number) {
    await this.sections.nth(index).locator('button, [role="button"]').first().click();
  }

  async getTasks(milestoneIndex: number) {
    return this.sections.nth(milestoneIndex).locator('[data-testid="task-item"]');
  }

  async clickAddTask(milestoneIndex: number) {
    await this.sections.nth(milestoneIndex).getByRole('button', { name: /add task/i }).click();
  }

  async getMilestoneCount() {
    return this.sections.count();
  }
}
