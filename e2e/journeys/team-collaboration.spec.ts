import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
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
        const projectId = 'collab-project-id';
        const projectData = [{ id: projectId, title: 'Collaboration Project', creator: OWNER_ID, owner_id: OWNER_ID }];
        const membersData = [];

        await page.route('**/rest/v1/tasks*', async (route) => {
            const method = route.request().method();
            if (method === 'GET') return route.fulfill({ body: JSON.stringify(projectData) });
            return route.fulfill({ body: '[]' });
        });

        await page.route('**/rest/v1/project_members*', async (route) => {
            const method = route.request().method();
            if (method === 'GET') return route.fulfill({ body: JSON.stringify(membersData) });
            if (method === 'POST') {
                const postData = route.request().postDataJSON();
                membersData.push(postData);
                return route.fulfill({ status: 201, body: JSON.stringify([postData]) });
            }
            return route.fulfill({ body: '[]' });
        });

        await setupAuthenticatedState(page, ownerSession);
        await page.goto(`/project/${projectId}`);
        await expect(page.getByRole('heading', { name: 'Collaboration Project' })).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: /Invite/i }).click();
        await expect(page.getByRole('heading', { name: 'Invite Member' })).toBeVisible();

        await page.getByLabel(/User Email or UUID/i).fill('invitee@example.com');
        await page.getByLabel(/Role/i).selectOption('editor');
        await page.getByRole('button', { name: 'Send Invite' }).click();

        await expect(page.getByText('Invitation sent successfully!')).toBeVisible();
    });

    test('Editor can invite a user to a project', async ({ page }) => {
        const projectId = 'collab-project-id';
        const projectData = [{ id: projectId, title: 'Editor Project', creator: OWNER_ID, owner_id: OWNER_ID }];
        const initialMembers = [{ project_id: projectId, user_id: EDITOR_ID, role: 'editor' }];

        await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, body: JSON.stringify(editorSession.user) }));

        await page.route('**/rest/v1/tasks*', async (route) => {
            return route.fulfill({ body: JSON.stringify(projectData) });
        });

        await page.route('**/rest/v1/project_members*', async (route) => {
            const method = route.request().method();
            if (method === 'GET') return route.fulfill({ body: JSON.stringify(initialMembers) });
            if (method === 'POST') {
                return route.fulfill({ status: 201, body: JSON.stringify([route.request().postDataJSON()]) });
            }
            return route.fulfill({ body: '[]' });
        });

        await setupAuthenticatedState(page, editorSession);
        await page.goto(`/project/${projectId}`);

        await expect(page.getByRole('button', { name: /Invite/i })).toBeVisible();
        await page.getByRole('button', { name: /Invite/i }).click();
        await page.getByLabel(/User Email or UUID/i).fill('invitee@example.com');
        await page.getByRole('button', { name: 'Send Invite' }).click();
        await expect(page.getByText('Invitation sent successfully!')).toBeVisible();
    });

    test('Viewer cannot invite users', async ({ page }) => {
        const projectId = 'collab-project-id';
        const projectData = [{ id: projectId, title: 'Viewer Project', creator: OWNER_ID, owner_id: OWNER_ID }];
        const initialMembers = [{ project_id: projectId, user_id: VIEWER_ID, role: 'viewer' }];

        await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, body: JSON.stringify(viewerSession.user) }));

        await page.route('**/rest/v1/tasks*', async (route) => {
            return route.fulfill({ body: JSON.stringify(projectData) });
        });

        await page.route('**/rest/v1/project_members*', async (route) => {
            return route.fulfill({ body: JSON.stringify(initialMembers) });
        });

        await setupAuthenticatedState(page, viewerSession);
        await page.goto(`/project/${projectId}`);

        await expect(page.getByRole('button', { name: /Invite/i })).not.toBeVisible();
    });

    test('Invited user can see project on dashboard', async ({ page }) => {
        const projectId = 'collab-project-id';
        const projectData = {
            id: projectId,
            title: 'Viewer Project',
            name: 'Viewer Project',
            creator: OWNER_ID,
            owner_id: OWNER_ID,
            status: 'planning',
            description: 'A project I was invited to'
        };

        await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, body: JSON.stringify(viewerSession.user) }));

        await page.route('**/rest/v1/project_members?select=*project%3Atasks*', async (route) => {
            return route.fulfill({ status: 200, body: JSON.stringify([{ project: projectData }]) });
        });

        await page.route('**/rest/v1/project_members?select=%2A&project_id*', async (route) => {
            return route.fulfill({ body: '[]' });
        });

        await page.route('**/rest/v1/tasks?select=*parent_task_id=is.null*', async (route) => {
            return route.fulfill({ body: '[]' });
        });

        await setupAuthenticatedState(page, viewerSession);
        await page.goto('/dashboard');

        await expect(page.getByText('Viewer Project')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('A project I was invited to')).toBeVisible();
    });

});
