import type { Page, Locator } from '@playwright/test';

export class TaskForm {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly notesInput: Locator;
  readonly purposeInput: Locator;
  readonly actionsInput: Locator;
  readonly startDateInput: Locator;
  readonly dueDateInput: Locator;
  readonly daysFromStartInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly librarySearch: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.getByLabel(/title/i);
    this.descriptionInput = page.getByLabel(/description/i);
    this.notesInput = page.getByLabel(/notes/i);
    this.purposeInput = page.getByLabel(/purpose/i);
    this.actionsInput = page.getByLabel(/actions/i);
    this.startDateInput = page.getByLabel(/start date/i);
    this.dueDateInput = page.getByLabel(/due date/i);
    this.daysFromStartInput = page.getByLabel(/days from start/i);
    this.saveButton = page.getByRole('button', { name: /save|add task/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.librarySearch = page.locator('[data-testid="library-search"]');
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title);
  }

  async fillDescription(desc: string) {
    await this.descriptionInput.fill(desc);
  }

  async clickSave() {
    await this.saveButton.click();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }
}
