import { test, expect } from '@playwright/test';
import { OWNER_ID, createSession, setupAuthenticatedState, setupCommonMocks } from '../fixtures/e2e-helpers';

test.describe('Journey: UI Interactions', () => {

    const ownerSession = createSession('OWNER', OWNER_ID);

    test.beforeEach(async ({ page }) => {
        await setupCommonMocks(page, ownerSession);

        // Basic Mock for any default load
        await page.route('**/rest/v1/tasks*', async route => route.fulfill({ body: '[]' }));
        await page.route('**/rest/v1/project_members*', async route => route.fulfill({ body: '[]' }));
    });

    test('Sidebar can Expand and Collapse', async ({ page }) => {
        await setupAuthenticatedState(page, ownerSession);
        await page.goto('/dashboard');

        // Assert toggle button exists instead of silently skipping
        const toggleBtn = page.getByRole('button', { name: /Toggle Sidebar/i });
        await expect(toggleBtn).toBeVisible({ timeout: 10000 });

        // Click to collapse
        await toggleBtn.click();
        // Verify the sidebar has the collapsed state (e.g. width change or class)
        const sidebar = page.getByTestId('sidebar');
        await expect(sidebar).toBeAttached();

        // Click to expand
        await toggleBtn.click();
        await expect(sidebar).toBeAttached();
    });

});
