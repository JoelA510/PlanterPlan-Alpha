import { test, expect } from '@playwright/test';
import {
    OWNER_ID, EDITOR_ID, VIEWER_ID,
    createSession, setupAuthenticatedState, setupCommonMocks,
} from '../fixtures/e2e-helpers';

test.describe('Journey: Role-Based Permissions', () => {

    test.describe.configure({ mode: 'serial' });

    const ownerSession = createSession('OWNER', OWNER_ID);
    const editorSession = createSession('EDITOR', EDITOR_ID);
    const viewerSession = createSession('VIEWER', VIEWER_ID);

    test.beforeEach(async ({ page }) => {
        await setupCommonMocks(page, ownerSession);
    });

    test('Owner has full access (Task CRUD, Settings, Team)', async ({ page }) => {
        const projectId = '00000000-0000-0000-0000-000000000010';
        const projectData = { id: projectId, title: 'Owner Project', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };
        const tasksData = [
            { id: '10000000-0000-0000-0000-000000000001', title: 'Phase 1', root_id: projectId, parent_task_id: projectId, status: 'not_started' },
            { id: '10000000-0000-0000-0000-000000000002', title: 'Milestone 1', root_id: projectId, parent_task_id: '10000000-0000-0000-0000-000000000001', status: 'not_started' },
            { id: '10000000-0000-0000-0000-000000000003', title: 'Task 1', root_id: projectId, parent_task_id: '10000000-0000-0000-0000-000000000002', status: 'todo' }
        ];

        await setupCommonMocks(page, ownerSession);

        // Mock Projects list
        await page.route(url => url.toString().includes('tasks') && url.toString().includes('origin=eq.instance') && !url.toString().includes('id=eq.'), route => {
            return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
        });

        // Mock Hierarchy/Tasks
        await page.route(new RegExp(`/rest/v1/tasks.*root_id=eq\\.${projectId}`), async route => {
            return route.fulfill({ status: 200, body: JSON.stringify(tasksData) });
        });

        // Mock Metadata
        await page.route(new RegExp(`/rest/v1/tasks.*[?&]id=eq\\.${projectId}`), async route => {
            return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
        });

        // Mock Members
        await page.route('**/rest/v1/project_members*', route => {
            return route.fulfill({ status: 200, body: JSON.stringify([{ project_id: projectId, user_id: OWNER_ID, role: 'owner' }]) });
        });

        await setupAuthenticatedState(page, ownerSession);
        await page.goto(`/project/${projectId}`);

        await expect(page.getByText('Task 1').first()).toBeVisible({ timeout: 15000 });

        // Use resilient role-based selectors
        await expect(page.getByRole('button', { name: /Add.*Task/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Settings/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Invite/i }).first()).toBeVisible();
    });

    test('Editor has restricted access (No Settings/Delete Project, Yes Task CRUD)', async ({ page }) => {
        const projectId = '00000000-0000-0000-0000-000000000020';
        const projectData = { id: projectId, title: 'Editor Project', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };
        const tasksData = [
            { id: '20000000-0000-0000-0000-000000000001', title: 'Phase 1', root_id: projectId, parent_task_id: projectId, status: 'not_started' },
            { id: '20000000-0000-0000-0000-000000000002', title: 'Milestone 1', root_id: projectId, parent_task_id: '20000000-0000-0000-0000-000000000001', status: 'not_started' },
            { id: '20000000-0000-0000-0000-000000000003', title: 'Editor Task', root_id: projectId, parent_task_id: '20000000-0000-0000-0000-000000000002', status: 'todo' }
        ];

        await setupCommonMocks(page, editorSession);

        // Mock Projects list
        await page.route(url => url.toString().includes('tasks') && url.toString().includes('origin=eq.instance') && !url.toString().includes('id=eq.'), route => {
            return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
        });

        // Mock Hierarchy/Tasks
        await page.route(new RegExp(`/rest/v1/tasks.*root_id=eq\\.${projectId}`), async route => {
            return route.fulfill({ status: 200, body: JSON.stringify(tasksData) });
        });

        // Mock Metadata
        await page.route(new RegExp(`/rest/v1/tasks.*[?&]id=eq\\.${projectId}`), async route => {
            return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
        });

        // Mock Members
        await page.route('**/rest/v1/project_members*', route => {
            return route.fulfill({ status: 200, body: JSON.stringify([{ project_id: projectId, user_id: EDITOR_ID, role: 'editor' }]) });
        });

        await setupAuthenticatedState(page, editorSession);
        await page.goto(`/project/${projectId}`);

        // [DEBUG] Capture state
        await page.screenshot({ path: `editor-render-debug-${Date.now()}.png` });
        page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));

        await expect(page.getByText('Editor Task').first()).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('button', { name: /Add.*Task/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Invite/i }).first()).toBeVisible();

        // Editor should NOT see project settings in the header
        await expect(page.getByRole('button', { name: /Settings/i }).first()).not.toBeVisible();
    });


    test('Viewer has Read-Only access', async ({ page }) => {
        const projectId = '00000000-0000-0000-0000-000000000030';
        const projectData = { id: projectId, title: 'Viewer Project', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };
        const tasksData = [
            { id: '30000000-0000-0000-0000-000000000001', title: 'Phase 1', root_id: projectId, parent_task_id: projectId, status: 'not_started' },
            { id: '30000000-0000-0000-0000-000000000002', title: 'Milestone 1', root_id: projectId, parent_task_id: '30000000-0000-0000-0000-000000000001', status: 'not_started' },
            { id: '30000000-0000-0000-0000-000000000003', title: 'Viewer Task', root_id: projectId, parent_task_id: '30000000-0000-0000-0000-000000000002', status: 'todo' }
        ];

        await setupCommonMocks(page, viewerSession);

        // Mock Projects list
        await page.route(url => url.toString().includes('tasks') && url.toString().includes('origin=eq.instance') && !url.toString().includes('id=eq.'), route => {
            return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
        });

        // Mock Hierarchy/Tasks
        await page.route(new RegExp(`/rest/v1/tasks.*root_id=eq\\.${projectId}`), async route => {
            return route.fulfill({ status: 200, body: JSON.stringify(tasksData) });
        });

        // Mock Metadata
        await page.route(new RegExp(`/rest/v1/tasks.*[?&]id=eq\\.${projectId}`), async route => {
            return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
        });

        // Mock Members
        await page.route('**/rest/v1/project_members*', route => {
            return route.fulfill({ status: 200, body: JSON.stringify([{ project_id: projectId, user_id: VIEWER_ID, role: 'viewer' }]) });
        });

        await setupAuthenticatedState(page, viewerSession);
        await page.goto(`/project/${projectId}`);

        await expect(page.getByText('Viewer Task').first()).toBeVisible({ timeout: 15000 });

        // Viewer should NOT see Add, Invite, or Settings
        // Use more specific locators to avoid false negatives
        await expect(page.getByRole('button', { name: /Add.*Task/i }).first()).not.toBeVisible();
        await expect(page.getByRole('button', { name: /Invite/i }).first()).not.toBeVisible();
        await expect(page.getByRole('button', { name: /Settings/i }).first()).not.toBeVisible();
    });

});
