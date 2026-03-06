import { test, expect } from '@playwright/test';
import { OWNER_ID, createSession, setupAuthenticatedState, setupCommonMocks } from '../fixtures/e2e-helpers';

test.describe('Journey: Dashboard', () => {

    const ownerSession = createSession('OWNER', OWNER_ID);

    test.beforeEach(async ({ page }) => {
        await setupCommonMocks(page, ownerSession);
    });

    test('Dashboard displays "Your Projects" and "Joined Projects" correctly', async ({ page }) => {
        // Mock Owned Projects
        await page.route('**/rest/v1/tasks?select=*parent_task_id=is.null*', async route => {
            return route.fulfill({
                status: 200,
                body: JSON.stringify([
                    { id: 'owned-1', title: 'My Owned Project', owner_id: OWNER_ID, creator: OWNER_ID }
                ])
            });
        });

        // Mock Joined Projects
        await page.route('**/rest/v1/project_members*', async route => {
            return route.fulfill({
                status: 200,
                body: JSON.stringify([
                    {
                        project_id: 'joined-1',
                        user_id: OWNER_ID,
                        role: 'editor',
                        project: { id: 'joined-1', title: 'My Joined Project', owner_id: 'other-id' }
                    }
                ])
            });
        });

        // Mock generic Project Members (for stats or other calls)
        await page.route('**/rest/v1/project_members?select=%2A&project_id*', async route => {
            return route.fulfill({ body: '[]' });
        });

        await setupAuthenticatedState(page, ownerSession);
        await page.goto('/dashboard');

        // Check Owned Section
        await expect(page.getByText('My Owned Project')).toBeVisible();

        // Check Joined Section
        await expect(page.getByText('My Joined Project')).toBeVisible();
    });

});
