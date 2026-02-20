
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {

    const fakeUser = {
        id: 'auth-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'test@example.com',
        app_metadata: { provider: 'email' },
        user_metadata: {},
        created_at: new Date().toISOString(),
    };

    const fakeSession = {
        access_token: 'fake-jwt-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake-refresh-token',
        user: fakeUser,
    };

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
        // Mock Supabase Auth Endpoints
        await page.route('**/auth/v1/user', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeUser) });
        });

        await page.route('**/auth/v1/token?grant_type=password', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession) });
        });

        let isLoggedOut = false;

        await page.route('**/auth/v1/session', async route => {
            if (isLoggedOut) {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ session: null }) });
            } else {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession) });
            }
        });

        await page.route('**/rest/v1/rpc/is_admin', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
        });

        await page.route('**/auth/v1/logout', async route => {
            isLoggedOut = true;
            await route.fulfill({ status: 204, body: '' });
        });

        // Mock Dashboard Data (to prevent 404s/hanging after login)
        await page.route('**/rest/v1/tasks*', async route => {
            const method = route.request().method();
            if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([{
                        id: 'mock-project-1',
                        title: 'Mock Project',
                        name: 'Mock Project',
                        status: 'active',
                        parent_task_id: null,
                        root_id: 'mock-project-1',
                        creator: 'auth-user-id',
                        created_at: new Date().toISOString()
                    }])
                });
            } else {
                await route.continue();
            }
        });

        // Mock empty sub-resources
        await page.route('**/rest/v1/project_members*', async route => route.fulfill({ status: 200, body: '[]' }));
        await page.route('**/rest/v1/task_resources*', async route => route.fulfill({ status: 200, body: '[]' }));
    });

    test('should allow a user to sign in using Dev Mode shortcut and sign out', async ({ page }) => {
        await test.step('1. Setup Clean State', async () => {
            await page.goto('/login');
            await page.evaluate(() => localStorage.clear());
        });

        // Initialize CSS Override for Stability (same as v2-golden)
        await page.addStyleTag({
            content: `* { opacity: 1 !important; transform: none !important; transition: none !important; animation: none !important; }`
        });

        await test.step('2. Perform Dev Login', async () => {
            // E2E Environment: Check if Dev Button is present
            const devButton = page.getByText('(Auto-Login as Test User)');
            await expect(devButton).toBeVisible();
            await devButton.click();
        });

        await test.step('3. Verify Dashboard Access', async () => {
            // Check for Dashboard header instead of URL redirect, as app stays on /
            await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 15000 });
        });

        await test.step('4. Sign Out', async () => {
            // Wait for sidebar/nav to be stable
            const signOutBtn = page.locator('aside').getByRole('button', { name: /Sign Out/i }).first();
            await expect(signOutBtn).toBeVisible({ timeout: 10000 });

            // Supabase client uses POST to /logout. We mock it in beforeEach.
            // Dispatch click directly because main element tends to intercept pointer events in headless mode
            await signOutBtn.dispatchEvent('click');
        });

        await test.step('5. Verify Logout', async () => {
            // Wait for the login screen to render
            await expect(page).toHaveURL(/.*\/login/);
            await expect(page.getByText('Sign in with Magic Link')).toBeVisible({ timeout: 10000 });
        });
    });
});
