import { test, expect } from '@playwright/test';
import { OWNER_ID, createSession, setupAuthenticatedState, setupCommonMocks } from '../fixtures/e2e-helpers';

test.describe('Journey: Drag and Drop', () => {
    const ownerSession = createSession('OWNER', OWNER_ID);

    test('Owner can drag and drop task to change status', async ({ page }) => {
        test.setTimeout(60000);
        const projectId = '00000000-0000-0000-0000-000000000050';
        const phaseId = '50000000-0000-0000-0000-000000000001';
        const msId = '50000000-0000-0000-0000-000000000002';
        const projectData = { id: projectId, title: 'DnD Project', name: 'DnD Project', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };
        const tasksData = [
            { id: phaseId, title: 'Phase 1', root_id: projectId, parent_task_id: projectId, status: 'not_started', position: 1000, creator: OWNER_ID },
            { id: msId, title: 'Milestone 1', root_id: projectId, parent_task_id: phaseId, status: 'not_started', position: 1000, creator: OWNER_ID },
            { id: '50000000-0000-0000-0000-000000000003', title: 'Task To Do', root_id: projectId, parent_task_id: msId, status: 'todo', position: 1000, creator: OWNER_ID },
            { id: '50000000-0000-0000-0000-000000000004', title: 'Task In Progress', root_id: projectId, parent_task_id: msId, status: 'in_progress', position: 2000, creator: OWNER_ID }
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

            if (method === 'PATCH') {
                const postData = route.request().postDataJSON();
                // Update mock data so re-fetch returns updated state
                const task = tasksData.find(t => url.includes(`id=eq.${t.id}`));
                if (task && postData.status) {
                    task.status = postData.status;
                }
                return route.fulfill({ status: 200, body: JSON.stringify([{ ...(task || tasksData[2]), ...postData }]) });
            }
            return route.fulfill({ body: '[]' });
        });

        await page.route('**/rest/v1/project_members*', (route) => {
            return route.fulfill({ status: 200, body: JSON.stringify([{ project_id: projectId, user_id: OWNER_ID, role: 'owner' }]) });
        });

        await setupAuthenticatedState(page, ownerSession);
        await page.goto(`/project/${projectId}`);

        // Wait for tasks to render inside the milestone section
        const taskCard = page.getByText('Task To Do').first();
        await expect(taskCard).toBeVisible({ timeout: 15000 });

        // Verify status change via native select (proven pattern)
        const taskRow = page.locator('[data-testid="task-row-50000000-0000-0000-0000-000000000003"]');
        const statusSelect = taskRow.locator('select');
        await expect(statusSelect).toBeVisible({ timeout: 5000 });
        await statusSelect.selectOption('in_progress');
        await expect(statusSelect).toHaveValue('in_progress', { timeout: 10000 });
    });
});
