import { test, expect } from '@playwright/test';
import { OWNER_ID, createSession, setupAuthenticatedState, setupCommonMocks } from '../fixtures/e2e-helpers';

test.describe('Journey: Drag and Drop', () => {

    const ownerSession = createSession('OWNER', OWNER_ID);

    test.beforeEach(async ({ page }) => {
        await setupCommonMocks(page, ownerSession);
    });

    test('Owner can drag and drop task to change status', async ({ page }) => {
        const projectId = 'dnd-project-id';
        const projectData = [{ id: projectId, title: 'DnD Project', owner_id: OWNER_ID, creator: OWNER_ID }];
        const membersData = [{ project_id: projectId, user_id: OWNER_ID, role: 'owner' }];
        const tasksData = [
            { id: 'task-1', title: 'Task To Do', project_id: projectId, status: 'todo', position: 1000 },
            { id: 'task-2', title: 'Task In Progress', project_id: projectId, status: 'in_progress', position: 2000 }
        ];

        let taskUpdated = false;

        await page.route('**/rest/v1/tasks*', async route => {
            const method = route.request().method();
            if (method === 'GET' && route.request().url().includes('parent_task_id=is.null')) return route.fulfill({ body: JSON.stringify(projectData) });
            if (method === 'GET' && route.request().url().includes('tasks?select')) return route.fulfill({ body: JSON.stringify(tasksData) });

            if (method === 'PATCH') {
                const postData = route.request().postDataJSON();
                if (postData.status === 'in_progress') {
                    taskUpdated = true;
                    return route.fulfill({ status: 200, body: JSON.stringify([{ ...tasksData[0], status: 'in_progress' }]) });
                }
            }
            return route.fulfill({ body: '[]' });
        });
        await page.route('**/rest/v1/project_members*', async route => route.fulfill({ body: JSON.stringify(membersData) }));

        await setupAuthenticatedState(page, ownerSession);
        await page.goto(`/project/${projectId}`);

        // Wait for tasks to render
        const taskCard = page.getByText('Task To Do');
        await expect(taskCard).toBeVisible();

        // Perform Drag and Drop via dragTo
        // Note: dnd-kit may not always respond to standard dragTo; consider test.fixme if flaky.
        await page.getByText('Task To Do').dragTo(page.getByText('In Progress').first());

        // Verify PATCH was called with status change
        expect(taskUpdated).toBe(true);
    });

});
