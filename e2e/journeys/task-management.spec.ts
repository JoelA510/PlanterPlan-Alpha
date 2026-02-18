import { test, expect } from '@playwright/test';
import { OWNER_ID, createSession, setupAuthenticatedState, setupCommonMocks } from '../fixtures/e2e-helpers';

/**
 * Task Management Journey E2E Test
 *
 * IMPORTANT: Route matching order matters!
 * 'root_id=eq.X' contains 'id=eq.X' as substring — always check root_id FIRST.
 */

test.describe('Journey: Task Management', () => {
    const ownerSession = createSession('OWNER', OWNER_ID);

    async function setupMembersMock(page: any, ...projectIds: string[]) {
        await page.route('**/rest/v1/project_members*', (route: any) => {
            const members = projectIds.map(pid => ({ project_id: pid, user_id: OWNER_ID, role: 'owner' }));
            return route.fulfill({ status: 200, body: JSON.stringify(members) });
        });
    }

    test('Owner can create a new task', async ({ page }) => {
        test.setTimeout(60000);
        const projectId = '00000000-0000-0000-0000-000000000040';
        const projectData = { id: projectId, title: 'Test Project', name: 'Test Project', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };
        const testProjectTasks: any[] = [
            { id: '40000000-0000-0000-0000-000000000001', title: 'Phase 1', status: 'not_started', parent_task_id: projectId, root_id: projectId, position: 1000, creator: OWNER_ID },
            { id: '40000000-0000-0000-0000-000000000002', title: 'Milestone 1', status: 'not_started', parent_task_id: '40000000-0000-0000-0000-000000000001', root_id: projectId, position: 1000, creator: OWNER_ID },
            { id: '40000000-0000-0000-0000-000000000003', title: 'Pre-existing Task', status: 'todo', parent_task_id: '40000000-0000-0000-0000-000000000002', root_id: projectId, position: 1000, creator: OWNER_ID }
        ];

        await setupCommonMocks(page, ownerSession);

        await page.route('**/rest/v1/tasks*', async (route: any) => {
            const url = route.request().url();
            const method = route.request().method();

            if (method === 'GET') {
                // IMPORTANT: Check root_id BEFORE id — substring collision prevention
                if (url.includes('root_id=eq.')) {
                    return route.fulfill({ status: 200, body: JSON.stringify(testProjectTasks) });
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
                    id: '40000000-0000-0000-0000-000000000004',
                    title: postData.title,
                    status: 'todo',
                    root_id: projectId,
                    parent_task_id: postData.parent_task_id || '40000000-0000-0000-0000-000000000002',
                    position: 5000,
                    creator: OWNER_ID
                };
                testProjectTasks.push(newTask);
                return route.fulfill({ status: 201, body: JSON.stringify([newTask]) });
            }
            return route.fulfill({ body: '[]' });
        });

        await setupMembersMock(page, projectId);
        await setupAuthenticatedState(page, ownerSession);
        await page.goto(`/project/${projectId}`);

        // Verify project loaded with hierarchy
        await expect(page.getByRole('heading', { name: 'Test Project' })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Phase 1').first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Milestone 1').first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Pre-existing Task').first()).toBeVisible({ timeout: 10000 });

        // Click the Add Task button — the ghost button at the bottom of the milestone task list
        const addBtn = page.getByRole('button', { name: /Add Task/i }).first();
        await expect(addBtn).toBeVisible({ timeout: 5000 });
        await addBtn.click();

        // Wait for the AddTaskModal dialog to open
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Fill the title input inside the dialog
        const titleInput = dialog.locator('#title');
        await expect(titleInput).toBeVisible({ timeout: 3000 });
        await titleInput.fill('Validated New Task');

        // Click the submit button inside the dialog
        await dialog.getByRole('button', { name: 'Add Task' }).click();

        // Verify the new task appears
        await expect(page.getByText('Validated New Task').first()).toBeVisible({ timeout: 10000 });
    });

    test('Owner can change task status', async ({ page }) => {
        test.setTimeout(60000);
        const projectId = '00000000-0000-0000-0000-000000000041';
        const projectData = { id: projectId, title: 'Status Project', name: 'Status Project', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };
        const tasksData = [
            { id: '41000000-0000-0000-0000-000000000001', title: 'Phase 1', root_id: projectId, parent_task_id: projectId, status: 'not_started', creator: OWNER_ID },
            { id: '41000000-0000-0000-0000-000000000002', title: 'Milestone 1', root_id: projectId, parent_task_id: '41000000-0000-0000-0000-000000000001', status: 'not_started', creator: OWNER_ID },
            { id: '41000000-0000-0000-0000-000000000003', title: 'Mutable Task', root_id: projectId, parent_task_id: '41000000-0000-0000-0000-000000000002', status: 'todo', position: 1000, creator: OWNER_ID }
        ];

        await setupCommonMocks(page, ownerSession);

        await page.route('**/rest/v1/tasks*', async (route: any) => {
            const url = route.request().url();
            const method = route.request().method();

            if (method === 'GET') {
                // IMPORTANT: Check root_id BEFORE id
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
                // Update the mock data so subsequent GETs return updated state
                const task = tasksData.find(t => url.includes(`id=eq.${t.id}`));
                if (task && postData.status) {
                    task.status = postData.status;
                }
                return route.fulfill({ status: 200, body: JSON.stringify([{ id: '41000000-0000-0000-0000-000000000003', ...postData }]) });
            }
            return route.fulfill({ body: '[]' });
        });

        await setupMembersMock(page, projectId);
        await setupAuthenticatedState(page, ownerSession);
        await page.goto(`/project/${projectId}`);

        await expect(page.getByText('Mutable Task').first()).toBeVisible({ timeout: 15000 });

        // TaskStatusSelect uses a native <select> element.
        // Locate via data-testid on the containing task row.
        const taskRow = page.locator('[data-testid="task-row-41000000-0000-0000-0000-000000000003"]');
        const statusSelect = taskRow.locator('select');
        await expect(statusSelect).toBeVisible({ timeout: 5000 });

        // Native select: use selectOption to change value
        await statusSelect.selectOption('in_progress');

        // Wait for React to re-render after the mutation + query invalidation
        await expect(statusSelect).toHaveValue('in_progress', { timeout: 10000 });
    });

    test('Project Isolation: Tasks do not leak between projects', async ({ page }) => {
        test.setTimeout(60000);
        const p1Id = '42000000-0000-0000-0000-000000000001';
        const p2Id = '43000000-0000-0000-0000-000000000001';
        const p1Data = { id: p1Id, title: 'Project 1', name: 'Project 1', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };
        const p2Data = { id: p2Id, title: 'Project 2', name: 'Project 2', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };

        await setupCommonMocks(page, ownerSession);

        // Consolidated route handler with correct priority ordering
        await page.route('**/rest/v1/tasks*', async (route) => {
            const url = route.request().url();
            // IMPORTANT: Check root_id BEFORE id — substring collision prevention
            if (url.includes(`root_id=eq.${p1Id}`)) return route.fulfill({ body: JSON.stringify([{ id: '42000000-0000-0000-0000-000000000002', title: 'Unique Task A', root_id: p1Id, parent_task_id: p1Id, creator: OWNER_ID }]) });
            if (url.includes(`root_id=eq.${p2Id}`)) return route.fulfill({ body: JSON.stringify([{ id: '43000000-0000-0000-0000-000000000002', title: 'Unique Task B', root_id: p2Id, parent_task_id: p2Id, creator: OWNER_ID }]) });
            if (url.includes(`id=eq.${p1Id}`)) return route.fulfill({ body: JSON.stringify([p1Data]) });
            if (url.includes(`id=eq.${p2Id}`)) return route.fulfill({ body: JSON.stringify([p2Data]) });
            if (url.includes('origin=eq.instance')) return route.fulfill({ body: JSON.stringify([p1Data, p2Data]) });
            return route.fulfill({ body: '[]' });
        });

        await setupMembersMock(page, p1Id, p2Id);
        await setupAuthenticatedState(page, ownerSession);

        await page.goto(`/project/${p1Id}`);
        await expect(page.getByText('Unique Task A').first()).toBeVisible({ timeout: 20000 });
        await expect(page.getByText('Unique Task B')).not.toBeVisible();

        await page.goto(`/project/${p2Id}`);
        await expect(page.getByText('Unique Task B').first()).toBeVisible({ timeout: 20000 });
        await expect(page.getByText('Unique Task A')).not.toBeVisible();
    });
});
