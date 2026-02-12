import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import crypto from 'crypto';

/**
 * Task Management Journey E2E Test - Data-Verification Version
 */

const SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

function signJWT(payload) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const toSign = `${encode(header)}.${encode(payload)}`;
    const signature = crypto.createHmac('sha256', SUPABASE_JWT_SECRET).update(toSign).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${toSign}.${signature}`;
}

test.describe('Journey: Task Management', () => {
    const jwtPayload = {
        sub: 'test-user-id',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
        app_metadata: { provider: 'email' },
        user_metadata: { full_name: 'Test Owner' }
    };
    const validFakeJWT = signJWT(jwtPayload);

    const fakeSession = {
        access_token: validFakeJWT,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake-refresh-token',
        user: {
            id: 'test-user-id',
            aud: 'authenticated',
            role: 'authenticated',
            email: TEST_USERS.OWNER.email,
            app_metadata: { provider: 'email' },
            user_metadata: { full_name: 'Test Owner' },
        },
    };

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            const text = msg.text();
            if (!text.includes('React DevTools') && !text.includes('[Fast Refresh]')) {
                console.log(`BROWSER [${msg.type()}]: ${text}`);
            }
        });
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

        // Auth Mocks
        await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, body: JSON.stringify(fakeSession.user) }));
        await page.route('**/auth/v1/session', route => route.fulfill({ status: 200, body: JSON.stringify(fakeSession) }));
        await page.route('**/auth/v1/token*', route => route.fulfill({ status: 200, body: JSON.stringify(fakeSession) }));
        await page.route('**/rest/v1/rpc/is_admin', route => route.fulfill({ status: 200, body: 'true' }));

        // Static Mocks
        await page.route('**/rest/v1/team_members*', route => route.fulfill({ status: 200, body: '[]' }));
        await page.route('**/rest/v1/project_members*', route => route.fulfill({ status: 200, body: '[]' }));
        await page.route('**/rest/v1/profiles*', route => route.fulfill({ status: 200, body: '[]' }));
        await page.route('**/rest/v1/tasks_with_primary_resource*', route => route.fulfill({ status: 200, body: '[]' }));
        await page.route('**/rest/v1/task_resources*', route => route.fulfill({ status: 200, body: '[]' }));
    });

    async function setupAuthenticatedState(page) {
        await page.goto('/');
        await expect(page.getByTestId('auth-seeder-active')).toBeAttached({ timeout: 10000 });

        await page.evaluate((session) => {
            window.dispatchEvent(new CustomEvent('SEED_AUTH', { detail: { session } }));
        }, fakeSession);

        await expect(page.getByTestId('auth-user-seeded')).toBeAttached({ timeout: 40000 });
    }

    test('Owner can create a new task', async ({ page }) => {
        let testProjectTasks = [
            { id: 'phase-1', title: 'Phase 1', status: 'active', parent_task_id: 'test-project-id', root_id: 'test-project-id', position: 0, creator: 'test-user-id', owner_id: 'test-user-id' },
            { id: 'milestone-1', title: 'Milestone 1', status: 'active', parent_task_id: 'phase-1', root_id: 'test-project-id', position: 0, creator: 'test-user-id', owner_id: 'test-user-id' },
            { id: 'task-pre', title: 'Pre-existing Task', status: 'todo', parent_task_id: 'milestone-1', root_id: 'test-project-id', position: 0, creator: 'test-user-id', owner_id: 'test-user-id' }
        ];

        await page.route('**/rest/v1/tasks*', async (route) => {
            const url = route.request().url();
            const method = route.request().method();

            if (method === 'GET') {
                if (url.includes('id=eq.test-project-id')) {
                    return route.fulfill({ status: 200, body: JSON.stringify([{ id: 'test-project-id', title: 'Test Project', name: 'Test Project', creator: 'test-user-id', owner_id: 'test-user-id' }]) });
                }
                if (url.includes('parent_task_id=is.null')) {
                    return route.fulfill({ status: 200, body: JSON.stringify([{ id: 'test-project-id', title: 'Test Project', name: 'Test Project', creator: 'test-user-id', owner_id: 'test-user-id' }]) });
                }
                return route.fulfill({ status: 200, body: JSON.stringify(testProjectTasks) });
            }

            if (method === 'POST') {
                const postData = route.request().postDataJSON();
                const newTask = {
                    id: `new-task-${Date.now()}`,
                    title: postData.title,
                    status: postData.status || 'todo',
                    project_id: 'test-project-id',
                    position: 0,
                    parent_task_id: postData.parent_task_id,
                    root_id: 'test-project-id'
                };
                testProjectTasks.push(newTask);
                return route.fulfill({ status: 201, body: JSON.stringify([newTask]) });
            }
            return route.fulfill({ status: 200, body: '{}' });
        });

        await setupAuthenticatedState(page);
        await page.goto('/project/test-project-id');

        // Wait for the project header AND the board to be present
        await expect(page.getByRole('heading', { name: 'Test Project' })).toBeVisible({ timeout: 20000 });
        await expect(page.getByText('Milestone 1').first()).toBeVisible({ timeout: 20000 });

        // Debug screenshot to see if button is visible
        await page.screenshot({ path: 'e2e-debug-create-task.png' });

        // Use a more robust locator and force click in case of overlay/animation
        await page.getByRole('button', { name: /Add Task/i }).first().click({ force: true });

        await page.getByLabel('Task Title *').fill('Validated New Task');
        await page.getByRole('button', { name: 'Add Task' }).click();

        await expect(page.getByText('Validated New Task')).toBeVisible();
    });

    test('Owner can change task status', async ({ page }) => {
        let testProjectTasks = [
            { id: 'phase-1', title: 'Phase 1', status: 'active', parent_task_id: 'test-id', root_id: 'test-id', position: 0, creator: 'test-user-id', owner_id: 'test-user-id' },
            { id: 'milestone-1', title: 'Milestone 1', status: 'active', parent_task_id: 'phase-1', root_id: 'test-id', position: 0, creator: 'test-user-id', owner_id: 'test-user-id' },
            { id: 'task-1', title: 'Mutable Task', status: 'todo', parent_task_id: 'milestone-1', root_id: 'test-id', position: 0, creator: 'test-user-id', owner_id: 'test-user-id' }
        ];

        await page.route('**/rest/v1/tasks*', async (route) => {
            const url = route.request().url();
            const method = route.request().method();

            if (method === 'GET') {
                if (url.includes('id=eq.test-id')) {
                    return route.fulfill({ body: JSON.stringify([{ id: 'test-id', title: 'Test Project', creator: 'test-user-id', owner_id: 'test-user-id' }]) });
                }
                if (url.includes('root_id=eq.test-id')) {
                    return route.fulfill({ body: JSON.stringify(testProjectTasks) });
                }
                return route.fulfill({ status: 200, body: '[]' });
            }

            if (method === 'PATCH' && url.includes('id=eq.task-1')) {
                const postData = route.request().postDataJSON();
                testProjectTasks[0] = { ...testProjectTasks[0], ...postData };
                return route.fulfill({ status: 200, body: JSON.stringify([testProjectTasks[0]]) });
            }
            return route.fulfill({ status: 200, body: '{}' });
        });

        await setupAuthenticatedState(page);
        await page.goto('/project/test-id');

        await expect(page.getByText('Mutable Task').first()).toBeVisible({ timeout: 20000 });

        const row = page.locator('[data-testid="task-row-task-1"]');
        const statusTrigger = row.locator('button[role="combobox"]');
        await statusTrigger.click();
        await page.getByRole('option', { name: 'In Progress' }).click();

        await expect(page.getByText('In Progress').first()).toBeVisible();
    });

    test('Project Isolation: Tasks do not leak between projects', async ({ page }) => {
        await page.route('**/rest/v1/tasks*', async (route) => {
            const url = route.request().url();
            if (url.includes('id=eq.p-a')) return route.fulfill({ body: JSON.stringify([{ id: 'p-a', title: 'Project A', owner_id: 'test-user-id' }]) });
            if (url.includes('id=eq.p-b')) return route.fulfill({ body: JSON.stringify([{ id: 'p-b', title: 'Project B', owner_id: 'test-user-id' }]) });
            if (url.includes('root_id=eq.p-a')) return route.fulfill({ body: JSON.stringify([{ id: 't-a', title: 'Unique Task A', root_id: 'p-a', owner_id: 'test-user-id' }]) });
            if (url.includes('root_id=eq.p-b')) return route.fulfill({ body: JSON.stringify([{ id: 't-b', title: 'Unique Task B', root_id: 'p-b', owner_id: 'test-user-id' }]) });
            return route.fulfill({ body: '[]' });
        });

        await setupAuthenticatedState(page);

        await page.goto('/project/p-a');
        await expect(page.getByText('Unique Task A')).toBeVisible({ timeout: 20000 });
        await expect(page.getByText('Unique Task B')).not.toBeVisible();

        await page.goto('/project/p-b');
        await expect(page.getByText('Unique Task B')).toBeVisible({ timeout: 20000 });
        await expect(page.getByText('Unique Task A')).not.toBeVisible();
    });
});
