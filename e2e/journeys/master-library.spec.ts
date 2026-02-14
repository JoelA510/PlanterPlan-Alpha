import { test, expect } from '@playwright/test';
import { OWNER_ID, createSession, setupAuthenticatedState, setupCommonMocks } from '../fixtures/e2e-helpers';

test.describe('Journey: Master Library', () => {

    const ownerSession = createSession('OWNER', OWNER_ID);

    test.beforeEach(async ({ page }) => {
        await setupCommonMocks(page, ownerSession);
    });

    test('Owner can search and add task from Master Library', async ({ page }) => {
        const projectId = 'lib-project-id';
        const projectData = [{ id: projectId, title: 'Library Project', owner_id: OWNER_ID, creator: OWNER_ID }];
        const membersData = [{ project_id: projectId, user_id: OWNER_ID, role: 'owner' }];

        // Library Tasks (Origin: 'master')
        const libraryTasks = [
            { id: 'lib-1', title: 'Standard Fundraising Task', project_id: null, origin: 'master' }
        ];

        await page.route('**/rest/v1/tasks*', async route => {
            const method = route.request().method();
            const url = route.request().url();

            // Initial Project Load
            if (method === 'GET' && url.includes('parent_task_id=is.null') && url.includes('origin=eq.instance'))
                return route.fulfill({ body: JSON.stringify(projectData) });

            if (method === 'GET' && url.includes('tasks?select') && url.includes('origin=eq.instance'))
                return route.fulfill({ body: '[]' }); // No tasks initially

            // Search Library Query (origin=eq.master)
            if (method === 'GET' && url.includes('origin=eq.master') && url.includes('title=ilike')) {
                return route.fulfill({ body: JSON.stringify(libraryTasks) });
            }

            // Create from Library (POST)
            if (method === 'POST') {
                const postData = route.request().postDataJSON();
                if (postData.title === 'Standard Fundraising Task') {
                    return route.fulfill({ status: 201, body: JSON.stringify([{ ...postData, id: 'new-inst-1' }]) });
                }
            }

            return route.fulfill({ body: '[]' });
        });
        await page.route('**/rest/v1/project_members*', async route => route.fulfill({ body: JSON.stringify(membersData) }));

        await setupAuthenticatedState(page, ownerSession);
        await page.goto(`/project/${projectId}`);

        // Open Add Task Modal
        await page.getByRole('button', { name: /Add.*Task/i }).first().click();

        // Look for Library Search input — assert instead of silently skipping
        const searchInput = page.getByPlaceholder(/Search library/i);
        await expect(searchInput).toBeVisible({ timeout: 5000 });

        await searchInput.fill('Fundraising');
        await page.getByText('Standard Fundraising Task').click();
        await page.getByRole('button', { name: /Add Task/i }).click();

        // Verify task appears on the board
        await expect(page.getByText('Standard Fundraising Task')).toBeVisible();
    });

});
