import type { Page, Locator } from '@playwright/test';

export class EditProjectModal {
  readonly page: Page;
  readonly dialog: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly locationInput: Locator;
  readonly dueSoonThresholdInput: Locator;
  readonly startDateButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;
  readonly confirmDeleteButton: Locator;
  readonly dateWarning: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[role="dialog"]');
    this.titleInput = page.locator('[role="dialog"]').getByLabel(/title/i);
    this.descriptionInput = page.locator('[role="dialog"]').getByLabel(/description/i);
    this.locationInput = page.locator('[role="dialog"]').getByLabel(/location/i);
    this.dueSoonThresholdInput = page.locator('[role="dialog"]').getByLabel(/due soon|threshold/i);
    this.startDateButton = page.locator('[role="dialog"]').locator('button:has-text("Pick a date")');
    this.saveButton = page.getByRole('button', { name: /save changes/i });
    this.cancelButton = page.locator('[role="dialog"]').getByRole('button', { name: /cancel/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.confirmDeleteButton = page.getByRole('button', { name: /are you sure|confirm/i });
    this.dateWarning = page.getByText(/shift all incomplete tasks/i);
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title);
  }

  async fillDescription(desc: string) {
    await this.descriptionInput.fill(desc);
  }

  async fillLocation(location: string) {
    await this.locationInput.fill(location);
  }

  async clickSave() {
    await this.saveButton.click();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  async clickDelete() {
    await this.deleteButton.click();
  }

  async confirmDelete() {
    await this.confirmDeleteButton.click();
  }
}
