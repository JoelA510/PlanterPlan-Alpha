import type { Page, Locator } from '@playwright/test';

export class TasksPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly taskItems: Locator;
  readonly listViewButton: Locator;
  readonly boardViewButton: Locator;
  readonly boardColumns: Locator;
  readonly emptyState: Locator;
  readonly spinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { level: 1 });
    this.taskItems = page.locator('[data-testid="task-item"]');
    this.listViewButton = page.getByRole('button', { name: /list/i });
    this.boardViewButton = page.getByRole('button', { name: /board/i });
    this.boardColumns = page.locator('[data-testid="board-column"]');
    this.emptyState = page.getByText(/no tasks/i);
    this.spinner = page.locator('.animate-spin');
  }

  async goto() {
    await this.page.goto('/tasks');
    await this.page.waitForLoadState('networkidle');
  }

  async getMyTasks() {
    return this.taskItems;
  }

  async clickListView() {
    await this.listViewButton.click();
  }

  async clickBoardView() {
    await this.boardViewButton.click();
  }

  async getViewMode(): Promise<'list' | 'board'> {
    const isBoardVisible = await this.boardColumns.first().isVisible().catch(() => false);
    return isBoardVisible ? 'board' : 'list';
  }

  async getBoardColumns() {
    return this.boardColumns;
  }
}
