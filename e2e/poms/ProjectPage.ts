import { Page, Locator, expect } from '@playwright/test';

export class ProjectPage {
    readonly page: Page;
    readonly addTaskBtn: Locator;
    readonly dialog: Locator;
    readonly titleInput: Locator;
    readonly submitTaskBtn: Locator;

    constructor(page: Page) {
        this.page = page;
        this.addTaskBtn = page.getByRole('button', { name: /Add Task/i }).first();
        this.dialog = page.getByRole('dialog');
        this.titleInput = this.dialog.locator('#title').first();
        this.submitTaskBtn = this.dialog.getByRole('button', { name: 'Add Task' });
    }

    async goto(projectId: string) {
        await this.page.goto(`/project/${projectId}`);
    }

    async verifyProjectLoaded(projectName: string) {
        await expect(this.page.getByRole('heading', { name: projectName })).toBeVisible({ timeout: 15000 });
    }

    async verifyProjectUrl() {
        await expect(this.page).toHaveURL(/\/project\/[a-zA-Z0-9-]+/, { timeout: 30000 });
    }

    getTaskRow(taskId: string): Locator {
        return this.page.locator(`[data-testid="task-row-${taskId}"]`);
    }

    async verifyTaskVisible(taskName: string) {
        await expect(this.page.getByText(taskName).first()).toBeVisible({ timeout: 20000 });
    }

    async verifyTaskNotVisible(taskName: string) {
        await expect(this.page.getByText(taskName)).not.toBeVisible();
    }

    async openAddTaskModal() {
        await expect(this.addTaskBtn).toBeVisible({ timeout: 5000 });
        await this.addTaskBtn.click();
        await expect(this.dialog).toBeVisible({ timeout: 5000 });
    }

    async fillAndSubmitTask(title: string) {
        await expect(this.titleInput).toBeVisible({ timeout: 3000 });
        await this.titleInput.fill(title);
        await this.submitTaskBtn.click();
    }

    async changeTaskStatus(taskId: string, status: string) {
        const row = this.getTaskRow(taskId);
        const statusSelect = row.locator('select');
        await expect(statusSelect).toBeVisible({ timeout: 5000 });
        await statusSelect.selectOption(status);
        await expect(statusSelect).toHaveValue(status, { timeout: 10000 });
    }
}
