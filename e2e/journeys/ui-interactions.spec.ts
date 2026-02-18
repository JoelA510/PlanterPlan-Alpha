import { test, expect } from '@playwright/test';
import { OWNER_ID, createSession, setupAuthenticatedState, setupCommonMocks } from '../fixtures/e2e-helpers';

test.describe('Journey: UI Interactions', () => {
    const ownerSession = createSession('OWNER', OWNER_ID);

    test('Sidebar navigation and Dashboard render correctly', async ({ page }) => {
        test.setTimeout(60000);

        await setupCommonMocks(page, ownerSession);

        // Mock ALL data endpoints to ensure Dashboard loads
        await page.route('**/rest/v1/tasks*', async (route) => route.fulfill({ body: '[]' }));
        await page.route('**/rest/v1/project_members*', async (route) => route.fulfill({ body: '[]' }));
        await page.route('**/rest/v1/tasks_with_primary_resource*', async (route) => route.fulfill({ body: '[]' }));

        await setupAuthenticatedState(page, ownerSession);

        // Dismiss Onboarding Wizard
        await page.evaluate(() => localStorage.setItem('gettingStartedDismissed', 'true'));

        await page.goto('/dashboard', { waitUntil: 'networkidle' });

        // Wait for Dashboard heading
        await expect(page.getByRole('heading', { name: /Dashboard/i }).first()).toBeVisible({ timeout: 30000 });

        // Verify ProjectSidebar elements (Dashboard uses ProjectSidebar, not AppSidebar)
        // 1. Sidebar Container (Project Switcher list)
        const projectSwitcher = page.getByTestId('project-switcher');
        await expect(projectSwitcher).toBeVisible({ timeout: 5000 });

        // 2. Global Nav Items (rendered as role="button" in GlobalNavItem)
        await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'My Tasks' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Reports' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();

        // 3. New Project Button
        await expect(page.getByTestId('sidebar-new-project-btn')).toBeVisible();
    });
});
