import { test, expect } from '@playwright/test';
import {
    OWNER_ID, EDITOR_ID, VIEWER_ID,
    createSession, setupAuthenticatedState, setupCommonMocks,
} from '../fixtures/e2e-helpers';

/**
 * Team Collaboration Journey E2E Test
 */

test.describe('Journey: Team Collaboration', () => {
    const ownerSession = createSession('OWNER', OWNER_ID);
    const editorSession = createSession('EDITOR', EDITOR_ID);
    const viewerSession = createSession('VIEWER', VIEWER_ID);

    test.beforeEach(async ({ page }) => {
        // Console logging for debugging (filtered)
        page.on('console', msg => {
            const text = msg.text();
            if (!text.includes('React DevTools') && !text.includes('[Fast Refresh]')) {
                console.log(`BROWSER [${msg.type()}]: ${text}`);
            }
        });

        // Common Mocks (default to owner)
        await setupCommonMocks(page, ownerSession);

        // Profiles Mock - Search by email
        await page.route('**/rest/v1/profiles*', async (route) => {
            const url = route.request().url();
            if (url.includes('email=eq.invitee%40example.com')) {
                return route.fulfill({ status: 200, body: JSON.stringify([{ id: 'test-invitee-id', email: 'invitee@example.com' }]) });
            }
            return route.fulfill({ status: 200, body: '[]' });
        });

        // RPC for invite
        await page.route('**/rest/v1/rpc/invite_user_to_project', async (route) => {
            return route.fulfill({ status: 200, body: 'true' });
        });
    });

    test('Owner can invite a user to a project', async ({ page }) => {
        const projectId = '00000000-0000-0000-0000-000000000050';
        const projectData = { id: projectId, title: 'Collaboration Project', creator: OWNER_ID, owner_id: OWNER_ID, status: 'active', created_at: new Date().toISOString() };
        const tasksData = [
            { id: 'phase-1', title: 'Phase 1', root_id: projectId, parent_task_id: projectId, status: 'not_started' },
            { id: 'milestone-1', title: 'Milestone 1', root_id: projectId, parent_task_id: 'phase-1', status: 'not_started' }
        ];

        await setupCommonMocks(page, ownerSession);

        // Mock Projects list (filter by instance origin)
        await page.route(url => url.toString().includes('tasks') && url.toString().includes('origin=eq.instance') && !url.toString().includes('id=eq.'), route => {
            return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
        });

        // Mock Hierarchy/Tasks (root_id check)
        await page.route('**/rest/v1/tasks*', async route => {
            const url = route.request().url();

            // Check root_id BEFORE id to match hierarchy call
            if (url.includes(`root_id=eq.${projectId}`)) {
                return route.fulfill({ status: 200, body: JSON.stringify(tasksData) });
            }

            // Check metadata fetch via id=eq
            if (url.includes(`id=eq.${projectId}`)) {
                return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
            }

            return route.fulfill({ status: 200, body: '[]' });
        });

        // Mock Members
        await page.route('**/rest/v1/project_members*', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({ status: 201, body: JSON.stringify([{ id: 'm-new' }]) });
            }
            return route.fulfill({ status: 200, body: JSON.stringify([{ project_id: projectId, user_id: OWNER_ID, role: 'owner' }]) });
        });

        await setupAuthenticatedState(page, ownerSession);
        await page.goto(`/project/${projectId}`);
        await expect(page.getByRole('heading', { name: 'Collaboration Project' })).toBeVisible({ timeout: 15000 });

        const inviteBtn = page.getByRole('button', { name: /Invite/i }).first();
        await expect(inviteBtn).toBeVisible();
        await inviteBtn.click();

        await expect(page.getByRole('heading', { name: 'Invite Member' })).toBeVisible();

        await page.getByLabel(/User Email or UUID/i).fill('invitee@example.com');
        await page.getByRole('button', { name: 'Send Invite' }).click();

        await expect(page.getByText('Invitation sent successfully!')).toBeVisible();
    });

    test('Editor can invite a user to a project', async ({ page }) => {
        const projectId = '00000000-0000-0000-0000-000000000051';
        const projectData = { id: projectId, title: 'Editor Project', creator: OWNER_ID, owner_id: OWNER_ID, status: 'active', created_at: new Date().toISOString() };
        const tasksData = [{ id: 'phase-1', title: 'Phase 1', root_id: projectId, parent_task_id: projectId, status: 'not_started' }];

        await setupCommonMocks(page, editorSession);

        await page.route('**/rest/v1/tasks*', async route => {
            const url = route.request().url();
            if (url.includes(`root_id=eq.${projectId}`)) {
                return route.fulfill({ status: 200, body: JSON.stringify(tasksData) });
            }
            if (url.includes(`id=eq.${projectId}`)) {
                return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
            }
            return route.fulfill({ status: 200, body: '[]' });
        });

        // Mock Members
        await page.route('**/rest/v1/project_members*', route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({ status: 201, body: JSON.stringify([{ id: 'm-new' }]) });
            }
            return route.fulfill({ status: 200, body: JSON.stringify([{ project_id: projectId, user_id: EDITOR_ID, role: 'editor' }]) });
        });

        await setupAuthenticatedState(page, editorSession);
        await page.goto(`/project/${projectId}`);

        const inviteBtn = page.getByRole('button', { name: /Invite/i }).first();
        await expect(inviteBtn).toBeVisible();
        await inviteBtn.click();

        await page.getByLabel(/User Email or UUID/i).fill('invitee@example.com');
        await page.getByRole('button', { name: 'Send Invite' }).click();
        await expect(page.getByText('Invitation sent successfully!')).toBeVisible();
    });

    test('Viewer cannot invite users', async ({ page }) => {
        const projectId = '00000000-0000-0000-0000-000000000052';
        const projectData = { id: '00000000-0000-0000-0000-000000000011', title: 'Test Project', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };
        const tasksData = [{ id: 'phase-1', title: 'Phase 1', root_id: projectId, parent_task_id: projectId, status: 'not_started' }];

        await setupCommonMocks(page, viewerSession);

        await page.route('**/rest/v1/tasks*', async route => {
            const url = route.request().url();
            if (url.includes(`root_id=eq.${projectId}`)) {
                return route.fulfill({ status: 200, body: JSON.stringify(tasksData) });
            }
            if (url.includes(`id=eq.${projectId}`)) {
                return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
            }
            return route.fulfill({ status: 200, body: '[]' });
        });

        // Mock Members
        await page.route('**/rest/v1/project_members*', route => {
            return route.fulfill({ status: 200, body: JSON.stringify([{ project_id: projectId, user_id: VIEWER_ID, role: 'viewer' }]) });
        });

        await setupAuthenticatedState(page, viewerSession);
        await page.goto(`/project/${projectId}`);

        await expect(page.getByRole('button', { name: /Invite/i }).first()).not.toBeVisible();
    });
});
