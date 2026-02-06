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
        access_token: 'fake-jwt-token-auth',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake-refresh-token-auth',
        user: fakeUser,
    };

    test.beforeEach(async ({ page }) => {
        // Network Mocks
        await page.route('**/auth/v1/user', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeUser) });
        });

        await page.route('**/auth/v1/token?grant_type=refresh_token', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession) });
        });

        await page.route('**/auth/v1/token?grant_type=password', async route => {
            // Simulate login success
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession) });
        });

        await page.route('**/auth/v1/session', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession) });
        });

        // IMPORTANT: Mock the RPC call that was causing the race condition
        await page.route('**/rest/v1/rpc/is_admin', async route => {
            // Add a small delay to simulate network latency, which might have triggered the race before
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
            await route.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
        });

        await page.route('**/auth/v1/logout', async route => {
            await route.fulfill({ status: 204, body: '' });
        });

        // Mock generic data calls to prevent 404s
        await page.route('**/rest/v1/projects*', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        });
        await page.route('**/rest/v1/tasks*', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        });
    });

    test('should allow a user to sign in, maintain session, and sign out', async ({ page }) => {
        await test.step('1. Setup Clean State', async () => {
            await page.goto('/');
            await page.evaluate(() => localStorage.clear());
        });

        await test.step('2. Perform Login', async () => {
            await page.goto('/login');
            const emailInput = page.getByLabel('Email address');
            await emailInput.waitFor({ state: 'visible', timeout: 30000 });

            await emailInput.fill('test@example.com');
            await page.getByLabel('Password').fill('password');
            await page.getByRole('button', { name: 'Sign In' }).click();
        });

        await test.step('3. Verify Dashboard Access', async () => {
            await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
        });

        await test.step('4. Verify Session Persistence (Reload)', async () => {
            await page.reload();
            await expect(page).toHaveURL(/\/dashboard/);
        });

        await test.step('5. Sign Out', async () => {
            // Ensure the button is interactive
            const signOutBtn = page.getByRole('button', { name: /Sign Out/i });
            await signOutBtn.waitFor({ state: 'visible', timeout: 10000 });
            await signOutBtn.click();
        });

        await test.step('6. Verify Logout', async () => {
            // Expect to be back at /login or /
            await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 10000 });
        });
    });
});
