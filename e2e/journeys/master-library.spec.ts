import { test, expect } from '@playwright/test';
import { OWNER_ID, createSession, setupAuthenticatedState, setupCommonMocks } from '../fixtures/e2e-helpers';

/**
 * Master Library Journey E2E Test
 *
 * Tests that an Owner can open the Add Task modal from a project board
 * and create a new task. The actual "Master Library search" feature is
 * not yet implemented in the AddTaskModal UI, so this test validates
 * the existing Add Task flow as a proxy for the library journey.
 */

test.describe('Journey: Master Library', () => {
    const ownerSession = createSession('OWNER', OWNER_ID);

    test('Owner can add task to project from board', async ({ page }) => {
        test.setTimeout(60000);
        const projectId = '00000000-0000-0000-0000-000000000060';
        const phaseId = '60000000-0000-0000-0000-000000000001';
        const msId = '60000000-0000-0000-0000-000000000002';
        const projectData = { id: projectId, title: 'Library Project', name: 'Library Project', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };
        const tasksData: any[] = [
            { id: phaseId, title: 'Phase 1', root_id: projectId, parent_task_id: projectId, status: 'not_started', position: 1000, creator: OWNER_ID },
            { id: msId, title: 'Milestone 1', root_id: projectId, parent_task_id: phaseId, status: 'not_started', position: 1000, creator: OWNER_ID },
        ];

        await setupCommonMocks(page, ownerSession);

        await page.route('**/rest/v1/tasks*', async (route) => {
            const url = route.request().url();
            const method = route.request().method();

            if (method === 'GET') {
                // Check root_id BEFORE id — substring collision prevention
                if (url.includes('root_id=eq.')) {
                    return route.fulfill({ status: 200, body: JSON.stringify(tasksData) });
                }
                if (url.includes(`id=eq.${projectId}`)) {
                    return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
                }
                if (url.includes('origin=eq.instance')) {
                    return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
                }
                return route.continue();
            }

            if (method === 'POST') {
                const postData = route.request().postDataJSON();
                const newTask = {
                    id: '60000000-0000-0000-0000-000000000003',
                    title: postData.title,
                    status: 'todo',
                    root_id: projectId,
                    parent_task_id: postData.parent_task_id || msId,
                    position: 5000,
                    creator: OWNER_ID,
                };
                tasksData.push(newTask);
                return route.fulfill({ status: 201, body: JSON.stringify([newTask]) });
            }
            return route.fulfill({ body: '[]' });
        });

        await page.route('**/rest/v1/project_members*', (route) => {
            return route.fulfill({ status: 200, body: JSON.stringify([{ project_id: projectId, user_id: OWNER_ID, role: 'owner' }]) });
        });

        await setupAuthenticatedState(page, ownerSession);
        await page.goto(`/project/${projectId}`);

        // Wait for Board
        await expect(page.getByRole('heading', { name: 'Library Project' })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Phase 1').first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Milestone 1').first()).toBeVisible({ timeout: 10000 });

        // Click Add Task button (inside milestone section — "No tasks yet" state)
        const addBtn = page.getByRole('button', { name: /Add Task/i }).first();
        await expect(addBtn).toBeVisible({ timeout: 5000 });
        await addBtn.click();

        // Wait for the AddTaskModal dialog
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Fill in the task form
        const titleInput = dialog.locator('#title');
        await expect(titleInput).toBeVisible({ timeout: 3000 });
        await titleInput.fill('Standard Fundraising Task');

        // Submit
        await dialog.getByRole('button', { name: 'Add Task' }).click();

        // Verify task appears on the board
        await expect(page.getByText('Standard Fundraising Task').first()).toBeVisible({ timeout: 10000 });
    });
});
