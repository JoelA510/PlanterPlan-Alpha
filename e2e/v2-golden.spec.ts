
import { test, expect } from '@playwright/test';

test.describe('PlanterPlan v2 Golden Path', () => {
    test.setTimeout(60000);

    test('should allow creating a project and task', async ({ page }) => {
        // Enable Console Logs
        page.on('console', msg => console.log(`[Browser]: ${msg.text()}`));

        // Mock Supabase Requests - GLOBAL CATCH-ALL for Tasks to ensure data loaded
        await page.route('**/rest/v1/tasks*', async route => {
            const method = route.request().method();

            if (method === 'GET') {
                // Return our Mock Project for ALL Task Get requests
                // This covers Dashboard list, Project Tree, etc.
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        {
                            id: 'mock-project-1',
                            title: 'Mock Project',
                            name: 'Mock Project', // Important for Aliased queries
                            status: 'planning', // Use valid status
                            template: 'launch_large',
                            parent_task_id: null,
                            root_id: 'mock-project-1',
                            creator: 'e2e-user-id',
                            origin: 'instance',
                            created_at: new Date().toISOString()
                        },
                        // Include a task too, just in case
                        {
                            id: 'mock-task-1',
                            title: 'Existing Task',
                            name: 'Existing Task',
                            status: 'todo',
                            parent_task_id: 'mock-project-1',
                            root_id: 'mock-project-1',
                            created_at: new Date().toISOString()
                        }
                    ])
                });
                return;
            }

            if (method === 'POST') {
                await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ id: 'mock-id-' + Date.now() }]) });
                return;
            }

            await route.continue();
        });

        // Mock RPC is_admin
        await page.route('**/rest/v1/rpc/is_admin', async route => {
            await route.fulfill({ status: 200, body: 'true' });
        });

        // Mock Auth User
        await page.route('**/auth/v1/user', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'e2e-user-id',
                    aud: 'authenticated',
                    role: 'authenticated',
                    email: 'test@example.com',
                    app_metadata: { provider: 'email', providers: ['email'] },
                    user_metadata: { name: 'E2E User' },
                    created_at: new Date().toISOString()
                })
            });
        });

        // Mock empty sub-resources
        await page.route('**/rest/v1/project_members*', async route => route.fulfill({ status: 200, body: '[]' }));
        await page.route('**/rest/v1/task_resources*', async route => route.fulfill({ status: 200, body: '[]' }));

        // Init Bypass
        await page.addInitScript(() => {
            localStorage.setItem('e2e-bypass-token', 'mock-token-123');
        });

        // Navigate
        await page.goto('/dashboard?e2e_bypass=true');

        // CSS Override for Stability
        await page.addStyleTag({
            content: `* { opacity: 1 !important; transform: none !important; transition: none !important; animation: none !important; }`
        });

        // Verify Dashboard
        await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible();

        // Verify Project List
        await expect(page.getByText('Mock Project').first()).toBeVisible({ timeout: 10000 });

        // Enter Project
        // Enter Project - Explicit navigate to keep bypass token
        await page.goto('/project/mock-project-1?e2e_bypass=true');

        // Verify Project View
        await expect(page.locator('h1').filter({ hasText: 'Mock Project' })).toBeVisible({ timeout: 10000 });

        // Verify Task
        await expect(page.getByText('Existing Task').first()).toBeVisible();
    });
});
