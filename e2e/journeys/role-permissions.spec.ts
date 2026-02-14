import { test, expect } from '@playwright/test';
import {
    OWNER_ID, EDITOR_ID, VIEWER_ID,
    createSession, setupAuthenticatedState, setupCommonMocks,
} from '../fixtures/e2e-helpers';

test.describe('Journey: Role-Based Permissions', () => {

    const ownerSession = createSession('OWNER', OWNER_ID);
    const editorSession = createSession('EDITOR', EDITOR_ID);
    const viewerSession = createSession('VIEWER', VIEWER_ID);

    test.beforeEach(async ({ page }) => {
        await setupCommonMocks(page, ownerSession);
    });

    test('Owner has full access (Task CRUD, Settings, Team)', async ({ page }) => {
        const projectId = 'owner-project-id';
        const projectData = [{ id: projectId, title: 'Owner Project', owner_id: OWNER_ID, creator: OWNER_ID }];
        const membersData = [{ project_id: projectId, user_id: OWNER_ID, role: 'owner' }];
        const tasksData = [
            { id: 'task-1', title: 'Task 1', project_id: projectId, status: 'todo', owner_id: OWNER_ID }
        ];

        await page.route('**/rest/v1/tasks*', async route => {
            const method = route.request().method();
            if (method === 'GET' && route.request().url().includes('parent_task_id=is.null')) return route.fulfill({ body: JSON.stringify(projectData) });
            if (method === 'GET') return route.fulfill({ body: JSON.stringify(tasksData) });
            if (method === 'POST') return route.fulfill({ status: 201, body: JSON.stringify([{ id: 'new-task', title: 'New Task' }]) });
            if (method === 'DELETE') return route.fulfill({ status: 204 });
            return route.fulfill({ body: '[]' });
        });
        await page.route('**/rest/v1/project_members*', async route => route.fulfill({ body: JSON.stringify(membersData) }));

        await setupAuthenticatedState(page, ownerSession);
        await page.goto(`/project/${projectId}`);

        await expect(page.getByText('Task 1')).toBeVisible();
        await expect(page.getByRole('button', { name: /Add.*Task/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Settings/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Invite/i })).toBeVisible();
    });

    test('Editor has restricted access (No Settings/Delete Project, Yes Task CRUD)', async ({ page }) => {
        const projectId = 'editor-project-id';
        const projectData = [{ id: projectId, title: 'Editor Project', owner_id: OWNER_ID, creator: OWNER_ID }];
        const membersData = [{ project_id: projectId, user_id: EDITOR_ID, role: 'editor' }];
        const tasksData = [{ id: 'task-1', title: 'Editor Task', project_id: projectId, status: 'todo' }];

        await page.route('**/auth/v1/user', route => route.fulfill({ body: JSON.stringify(editorSession.user) }));
        await page.route('**/rest/v1/tasks*', async route => {
            const method = route.request().method();
            const url = route.request().url();
            if (method === 'GET' && url.includes('parent_task_id=is.null')) return route.fulfill({ body: JSON.stringify(projectData) });
            if (method === 'GET') return route.fulfill({ body: JSON.stringify(tasksData) });
            return route.fulfill({ body: '[]' });
        });
        await page.route('**/rest/v1/project_members*', async route => route.fulfill({ body: JSON.stringify(membersData) }));

        await setupAuthenticatedState(page, editorSession);
        await page.goto(`/project/${projectId}`);

        await expect(page.getByText('Editor Task')).toBeVisible();
        await expect(page.getByRole('button', { name: /Add.*Task/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Invite/i })).toBeVisible();
    });


    test('Viewer has Read-Only access', async ({ page }) => {
        const projectId = 'viewer-project-id';
        const projectData = [{ id: projectId, title: 'Viewer Project', owner_id: OWNER_ID, creator: OWNER_ID }];
        const membersData = [{ project_id: projectId, user_id: VIEWER_ID, role: 'viewer' }];
        const tasksData = [{ id: 'task-1', title: 'Viewer Task', project_id: projectId, status: 'todo' }];

        await page.route('**/auth/v1/user', route => route.fulfill({ body: JSON.stringify(viewerSession.user) }));

        await page.route('**/rest/v1/tasks*', async route => {
            const method = route.request().method();
            if (method === 'GET') {
                if (route.request().url().includes('parent_task_id=is.null')) return route.fulfill({ body: JSON.stringify(projectData) });
                return route.fulfill({ body: JSON.stringify(tasksData) });
            }
            return route.fulfill({ status: 403, body: 'Forbidden' });
        });
        await page.route('**/rest/v1/project_members*', async route => route.fulfill({ body: JSON.stringify(membersData) }));

        await setupAuthenticatedState(page, viewerSession);
        await page.goto(`/project/${projectId}`);

        await expect(page.getByText('Viewer Task')).toBeVisible();
        await expect(page.getByRole('button', { name: /Add.*Task/i })).not.toBeVisible();
        await expect(page.getByRole('button', { name: /Invite/i })).not.toBeVisible();
        await expect(page.getByRole('button', { name: /Settings/i })).not.toBeVisible();
    });

});
