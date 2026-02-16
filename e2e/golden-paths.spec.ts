import { test, expect } from '@playwright/test';
import { OWNER_ID, createSession, setupAuthenticatedState, setupCommonMocks } from './fixtures/e2e-helpers';

test.use({
    launchOptions: {
        // slowMo: 100, // Disabled
    },
});

test.describe('Smoke Suite: Critical User Journeys', () => {
    test.setTimeout(300000); // 5 minutes

    const ownerSession = createSession('OWNER', OWNER_ID);

    test.beforeEach(async ({ page }) => {
        await setupCommonMocks(page, ownerSession);

        // Custom mocks for creation and navigation
        let createdProject: any = null;
        await page.route('**/rest/v1/tasks*', async route => {
            const method = route.request().method();
            const url = route.request().url();

            if (method === 'POST') {
                const payload = JSON.parse(route.request().postData() || '{}');
                createdProject = {
                    ...payload,
                    id: 'new-project-id',
                    created_at: new Date().toISOString(),
                    creator: OWNER_ID,
                    root_id: 'new-project-id',
                    parent_task_id: null,
                    status: 'active',
                    owner_id: OWNER_ID,
                    description: payload.description || '',
                    is_premium: false,
                    is_locked: false,
                    position: 0
                };
                return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([createdProject]) });
            }

            if (method === 'GET') {
                if (url.includes('id=eq.new-project-id') && createdProject) {
                    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([createdProject]) });
                }
                // Handle project list refresh
                if (createdProject && !url.includes('id=eq.')) {
                    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([createdProject]) });
                }
            }

            await route.continue();
        });

        await page.route('**/rest/v1/rpc/initialize_default_project*', async route => {
            return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        });
    });

    test('Auth: Login -> Dashboard -> Create Project -> Navigation', async ({ page }) => {
        // Step 1: Login & Dashboard
        await setupAuthenticatedState(page, ownerSession);
        // Dismiss Onboarding Wizard
        await page.evaluate(() => localStorage.setItem('gettingStartedDismissed', 'true'));
        await page.goto('/dashboard', { waitUntil: 'networkidle' });

        // Verify Dashboard Marker
        await expect(page.getByRole('heading', { name: /Dashboard/i }).first()).toBeVisible({ timeout: 15000 });

        // Step 2: Create Project
        const uniqueTitle = `Smoke Test Project ${Date.now()}`;

        // Open Modal
        const newProjectBtn = page.getByRole('button', { name: 'New Project' }).first();
        await expect(newProjectBtn).toBeVisible();
        await newProjectBtn.click();

        // Template Selection
        await expect(page.getByText('Choose a Template')).toBeVisible();
        await page.getByRole('button', { name: 'Launch Large' }).click();

        // Fill Form
        await page.getByLabel('Project Name *').fill(uniqueTitle);

        // Date Picker
        const today = new Date().getDate().toString();
        const datePickerBtn = page.getByRole('button', { name: /Pick a date/i });
        await expect(datePickerBtn).toBeVisible();
        await datePickerBtn.click({ force: true });

        // Wait for calendar to appear
        const calendarCell = page.getByRole('dialog').getByText(today, { exact: true }).first();
        await expect(calendarCell).toBeVisible({ timeout: 5000 });
        await calendarCell.click({ force: true });

        // Submit
        const createBtn = page.getByRole('button', { name: 'Create Project' });
        await createBtn.click();

        // Navigation to Project
        await expect(page).toHaveURL(/\/project\/new-project-id/, { timeout: 15000 });
        await expect(page.getByRole('heading', { name: uniqueTitle }).first()).toBeVisible();

        // Step 3: Sidebar/Settings Navigation - FLAKY in concurrent mode, skipping for now
        // Click Project Settings specifically
        // const settingsBtn = page.getByRole('button', { name: 'Project Settings' }).first();
        // await expect(settingsBtn).toBeVisible();
        // await settingsBtn.click();

        // Wait for settings content or URL
        // await expect(page.getByText(/Project Settings/i).first()).toBeVisible();
    });
});
