import { test, expect } from '@playwright/test';

test.describe('Golden Path: Project Creation', () => {

    const fakeUser = {
        id: 'test-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'joela510@gmail.com',
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
        // 1. Mock LocalStorage with Session
        //    Supabase client checks for 'sb-<ref>-auth-token'
        //    We need to know the localStorage key. Usually it's `sb-${VITE_SUPABASE_URL_REF}-auth-token`
        //    or default `supabase.auth.token`.
        //    Let's try to set it, but mocking network is more robust if client validates on load.

        // 2. Comprehensive Network Mocks
        // 2. Comprehensive Network Mocks
        await page.route('**/auth/v1/user', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeUser) });
        });

        await page.route('**/auth/v1/token?grant_type=refresh_token', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession) });
        });

        // Handle initial session check if it hits the server
        await page.route('**/auth/v1/session', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession) });
        });

        await page.route('**/rest/v1/rpc/is_admin', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
        });

        await page.route('**/rest/v1/tasks*', async route => {
            // Return empty list initially
            await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        });

        await page.route('**/rest/v1/team_members*', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        });

        // Mock project creation (POST)
        await page.route('**/rest/v1/tasks', async route => {
            if (route.request().method() === 'POST') {
                const payload = JSON.parse(route.request().postData() || '{}');
                // Return the created project
                const response = {
                    ...payload,
                    id: 'new-project-id',
                    created_at: new Date().toISOString(),
                    owner_id: fakeUser.id,
                    creator: fakeUser.id // crucial for RLS
                };
                await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([response]) }); // PostgREST returns array
            } else {
                await route.fallback();
            }
        });

    });

    test('should allow a user to create a new project', async ({ page }) => {
        // 1. Visit App
        //    Start at dashboard directly to trigger Auth check
        await page.goto('/dashboard');

        //    Wait for Dashboard to appear (bypassing login if mocks work)
        //    If we are redirected to login, the mocks might not have been enough (client side logic).
        //    Let's check.

        //    If we see "Sign In", let's fake the login click.
        if (await page.getByRole('button', { name: 'Sign In' }).isVisible({ timeout: 2000 })) {
            console.log('Detected Login Page - Attempting UI Login with Mocks');
            await page.getByLabel('Email address').fill('joela510@gmail.com');
            await page.getByLabel('Password').fill('password');

            // Mock the sign-in request
            await page.route('**/auth/v1/token?grant_type=password', async route => {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession) });
            });

            await page.getByRole('button', { name: 'Sign In' }).click();
        }

        // 3. Verify Dashboard Access

        // Handle Onboarding Wizard (auto-opens on empty project list)
        // We skip it to test the manual "New Project" flow, or we could test the wizard itself.
        // For now, let's skip to match the existing test steps.
        const wizardTitle = page.getByRole('heading', { name: 'Welcome to PlanterPlan' });
        // Since we mock empty projects, the wizard SHOULD appear. Wait for it.
        await expect(wizardTitle).toBeVisible({ timeout: 20000 });

        await expect(wizardTitle).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: 'Skip' }).click();
        await expect(wizardTitle).not.toBeVisible();

        // 4. Start New Project Flow
        // Use .nth(1) to target the Header New Project button (Sidebar is 0, Header is 1)
        // Sidebar button might not be wired to Dashboard's modal state if layout prevents it.
        const newProjectBtn = page.getByRole('button', { name: 'New Project' }).nth(1);
        await expect(newProjectBtn).toBeVisible({ timeout: 15000 });

        await expect(newProjectBtn).toBeVisible({ timeout: 15000 });

        await page.waitForTimeout(1000); // Wait for UI stability after Wizard dismissal

        await newProjectBtn.click();

        // 5. Select Template (Step 1)
        await expect(page.getByText('Choose a Template')).toBeVisible();
        await page.getByRole('button', { name: 'Launch Large' }).click();

        // 6. Fill Project Details (Step 2)
        await expect(page.getByLabel('Project Name *')).toBeVisible();
        const uniqueTitle = `Golden Path Project ${Date.now()}`;
        await page.getByLabel('Project Name *').fill(uniqueTitle);

        // 7. Create
        await page.getByRole('button', { name: 'Create Project' }).click();

        // 8. Verify - Modal should close
        await expect(page.getByRole('heading', { name: 'Choose a Template' })).not.toBeVisible();

        // Optional: Verify "Create Your First Project" is gone (if valid list) OR we mock the list refresh?
        // Since we didn't mock the list REFRESH, it will re-fetch empty list [].
        // So visual state might not update perfectly, but Modal Closing proves success of the flow.
    });

});
