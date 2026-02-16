import { test, expect } from '@playwright/test';
import { createSession, setupAuthenticatedState, setupCommonMocks, OWNER_ID } from './fixtures/e2e-helpers';

test.describe('Sidebar Actions', () => {
    test.setTimeout(30000);

    test.beforeEach(async ({ page }) => {
        // Debug logging
        page.on('console', msg => console.log(`[Browser Console] ${msg.text()}`));

        const session = createSession('OWNER', OWNER_ID);
        await setupCommonMocks(page, session);

        await page.addInitScript(() => {
            window.localStorage.setItem('gettingStartedDismissed', 'true');
        });
        await setupAuthenticatedState(page, session);

        const projectData = { id: '00000000-0000-0000-0000-000000000011', title: 'Test Project', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };

        // Mock Projects list
        await page.route(url => url.toString().includes('tasks') && url.toString().includes('origin=eq.instance') && !url.toString().includes('id=eq.'), route => {
            return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
        });

        await page.route('**/rest/v1/team_members*', route => route.fulfill({ status: 200, body: '[]' }));
        await page.route('**/rest/v1/project_members*', route => route.fulfill({ status: 200, body: '[]' }));
        await page.route('**/rest/v1/profiles*', route => route.fulfill({ status: 200, body: '[]' }));
    });

    test('Sidebar "New Project" button opens CreateProjectModal', async ({ page }) => {
        await page.goto('/dashboard', { waitUntil: 'networkidle' });
        await page.setViewportSize({ width: 1920, height: 1080 });

        // Wait for dashboard heading to ensure load
        await expect(page.getByRole('heading', { name: /Dashboard/i }).first()).toBeVisible({ timeout: 15000 });

        const newProjectBtn = page.getByTestId('sidebar-new-project-btn');
        await expect(newProjectBtn).toBeVisible();
        await newProjectBtn.click({ force: true });

        // Select template first
        await expect(page.getByText('Choose a Template').first()).toBeVisible();
        await page.getByRole('button', { name: 'Start from scratch' }).click();

        // Now expect Create Project/Project Details modal
        await expect(page.getByText('Project Details').first()).toBeVisible();

        // Close modal
        await page.keyboard.press('Escape');
    });

    test('Sidebar "New Template" button opens CreateTemplateModal', async ({ page }) => {
        await page.goto('/dashboard', { waitUntil: 'networkidle' });
        await page.setViewportSize({ width: 1920, height: 1080 });

        await expect(page.getByRole('heading', { name: /Dashboard/i }).first()).toBeVisible({ timeout: 15000 });

        const newTemplateBtn = page.getByTestId('sidebar-new-template-btn');
        await expect(newTemplateBtn).toBeVisible({ timeout: 10000 });
        await newTemplateBtn.click();

        await expect(page.getByRole('dialog').getByText(/Create New Template/i)).toBeVisible({ timeout: 15000 });
    });
});
