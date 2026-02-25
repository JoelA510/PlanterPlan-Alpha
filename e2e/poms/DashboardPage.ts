import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
    readonly page: Page;
    readonly newProjectBtn: Locator;
    readonly dialog: Locator;
    readonly projectNameInput: Locator;

    constructor(page: Page) {
        this.page = page;
        this.dialog = page.getByRole('dialog');
        // In the empty state, it might have "Create Your First Project"
        this.newProjectBtn = page.getByRole('button', { name: /New Project|Create Your First Project/i }).first();
        this.projectNameInput = this.dialog.locator('#title').first();
    }

    async goto() {
        await this.page.goto('/dashboard');
        await this.page.waitForLoadState('networkidle');
        await this.page.keyboard.press('Escape'); // clear modals
    }

    async verifyDashboardLoaded() {
        const marker = this.page.getByRole('heading', { name: /Dashboard|No projects yet/i }).first();
        await expect(marker).toBeVisible({ timeout: 20000 });
    }

    async handleOnboardingModal() {
        const modal = this.page.getByRole('dialog').filter({ hasText: /Welcome to PlanterPlan|Onboarding/i });
        if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
            const skipBtn = modal.getByRole('button', { name: /Skip/i });
            if (await skipBtn.isVisible({ timeout: 2000 })) {
                await skipBtn.click();
            } else {
                await this.page.keyboard.press('Escape');
            }
            await expect(modal).not.toBeVisible({ timeout: 5000 });
        }
    }

    async startNewProject() {
        await expect(this.newProjectBtn).toBeVisible({ timeout: 15000 });
        await this.newProjectBtn.click();
        await expect(this.dialog.filter({ hasText: /Choose a Template|Project Details/i })).toBeVisible({ timeout: 15000 });
    }

    async startFromScratch() {
        const scratchBtn = this.dialog.getByRole('button').filter({ hasText: /Start from scratch/i }).first();
        await expect(scratchBtn).toBeVisible();
        await scratchBtn.scrollIntoViewIfNeeded();

        const btnHandle = await scratchBtn.elementHandle();
        if (btnHandle) {
            await btnHandle.evaluate((node) => (node as HTMLElement).click());
        } else {
            throw new Error('Scratch button handle not found');
        }

        await expect(this.page.getByRole('heading', { name: 'Project Details' })).toBeVisible({ timeout: 15000 });
    }

    async selectTemplate(templateName: string) {
        const templateSelection = this.dialog.getByRole('button').filter({ hasText: new RegExp(templateName, 'i') }).first();
        await expect(templateSelection).toBeVisible({ timeout: 10000 });
        await templateSelection.click({ force: true });

        await expect(this.page.getByRole('heading', { name: /Project Details/i })).toBeVisible({ timeout: 15000 });
    }

    async fillProjectDetailsAndSubmit(name: string) {
        // Wait for input to be active 
        const titleInput = this.page.locator('input#title').first();
        await expect(titleInput).toBeVisible({ timeout: 15000 });
        await titleInput.fill(name);

        await this.page.getByRole('button', { name: /Pick a date/i }).click();
        await expect(this.page.getByRole('grid')).toBeVisible({ timeout: 5000 });
        const today = new Date().getDate().toString();

        const dayButton = this.page.getByRole('button', { name: today, exact: true })
            .or(this.page.getByRole('gridcell', { name: today, exact: true }));

        if (await dayButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await dayButton.first().click({ force: true });
        } else {
            await this.page.getByText(today, { exact: true }).first().click({ force: true });
        }

        const createBtn = this.dialog.getByRole('button', { name: /Create Project|Launch|Submit/i });
        await expect(createBtn).toBeEnabled({ timeout: 10000 });
        await createBtn.click();
    }
}
