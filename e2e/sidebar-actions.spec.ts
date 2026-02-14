import { test, expect } from '@playwright/test';
import { createSession, setupAuthenticatedState, setupCommonMocks, OWNER_ID } from './fixtures/e2e-helpers';

test.describe('Sidebar Actions', () => {
    test.setTimeout(30000);

    test.beforeEach(async ({ page }) => {
        // Debug logging
        page.on('console', msg => console.log(`[Browser Console] ${msg.text()}`));

        // Defines a session
        const session = createSession('OWNER', OWNER_ID);

        // 1. Setup Auth Mocks
        await setupCommonMocks(page, session);

        // 2. Setup App State (bypass login)
        await page.addInitScript(() => {
            window.localStorage.setItem('gettingStartedDismissed', 'true');
        });
        await setupAuthenticatedState(page, session);

        // 3. Mock Data
        // Project.listByCreator calls 'tasks' table
        await page.route('**/rest/v1/tasks*', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
            } else {
                await route.continue();
            }
        });
        await page.route('**/rest/v1/team_members*', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        });
        await page.route('**/rest/v1/project_members*', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        });

        // 4. Mock Project/Template Creation endpoints if needed (modals just need to open)
    });

    test('Sidebar "New Project" button opens CreateProjectModal', async ({ page }) => {
        await page.goto('/dashboard');
        await page.setViewportSize({ width: 1920, height: 1080 });

        // Wait for sidebar to load and auth to settle
        const newProjectBtn = page.getByTestId('sidebar-new-project-btn');
        await expect(newProjectBtn).toBeVisible({ timeout: 15000 });

        await newProjectBtn.click();

        await expect(page.getByRole('dialog').getByText('Create New Project')).toBeVisible({ timeout: 15000 });
        await page.getByRole('button', { name: 'Close' }).click().catch(() => page.keyboard.press('Escape'));
    });

    test('Sidebar "New Template" button opens CreateTemplateModal', async ({ page }) => {
        await page.goto('/dashboard');
        await page.setViewportSize({ width: 1920, height: 1080 });

        const newTemplateBtn = page.getByTestId('sidebar-new-template-btn');
        await expect(newTemplateBtn).toBeVisible({ timeout: 15000 });

        await newTemplateBtn.click();

        await expect(page.getByRole('dialog').getByText('Create New Template')).toBeVisible({ timeout: 15000 });
        // The category selector might be "Select Category" or similar, "Task Checklist" is one option
        // Let's just check for the modal title which is unique enough
    });
});
