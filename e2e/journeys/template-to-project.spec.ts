import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';

test.describe('Journey: Template to Project Instantiation', () => {
    test.setTimeout(300000); // 5 minutes

    const fakeSession = {
        access_token: 'fake-jwt-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake-refresh-token',
        user: {
            id: 'test-user-id',
            aud: 'authenticated',
            role: 'owner',
            email: TEST_USERS.OWNER.email,
        },
    };

    test.beforeEach(async ({ page }) => {
        // Browser error capture (console forwarding removed to reduce noise)
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

        // --- Network Mocks ---
        await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, body: JSON.stringify(fakeSession.user) }));
        await page.route('**/auth/v1/session', route => route.fulfill({ status: 200, body: JSON.stringify(fakeSession) }));
        await page.route('**/rest/v1/rpc/is_admin', route => route.fulfill({ status: 200, body: 'true' }));

        // Data Mocks
        // Mock Project Creation (which hits /tasks in PlanterClient)
        await page.route('**/rest/v1/tasks*', async route => {
            const method = route.request().method();
            if (method === 'POST') {

                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify([{
                        id: 'new-project-id-123',
                        title: 'PlanterPlan Template Proj',
                        creator: 'test-user-id',
                        origin: 'instance',
                        parent_task_id: null,
                        created_at: new Date().toISOString()
                    }])
                });
            } else {
                await route.fulfill({ status: 200, body: JSON.stringify([]) });
            }
        });

        await page.route('**/rest/v1/projects*', route => route.fulfill({ status: 200, body: JSON.stringify([]) }));
        await page.route('**/rest/v1/team_members*', route => route.fulfill({ status: 200, body: '[]' }));
        await page.route('**/rest/v1/project_members*', route => route.fulfill({ status: 200, body: '[]' }));

        // Project Creation Mocks
        await page.route('**/rest/v1/rpc/initialize_default_project', route => route.fulfill({ status: 200, body: '{}' }));

        // Password Auth Mock
        await page.route('**/auth/v1/token?grant_type=password', route => route.fulfill({ status: 200, body: JSON.stringify(fakeSession) }));
    });

    async function handleLogin(page) {
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

        const loginOrDashboard = page.locator('h1, h2, button').filter({ hasText: /PlanterPlan|Dashboard|Sign in|Log in/i }).first();
        await loginOrDashboard.waitFor({ timeout: 20000 });
        const text = await loginOrDashboard.textContent();

        if (text?.includes('PlanterPlan') || text?.includes('Sign in') || text?.includes('Log in')) {
            const emailInput = page.getByLabel(/Email/i);
            const passwordInput = page.locator('input[type="password"]');

            await emailInput.fill('');
            await emailInput.fill(TEST_USERS.OWNER.email);

            await passwordInput.fill('');
            await passwordInput.fill(TEST_USERS.OWNER.password);

            await page.getByRole('button', { name: /Sign In|Log in/i }).click();
            await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
        }

        // --- Handle Onboarding Modal ---

        // The wizard uses Dialog from @shared/ui/dialog which has role="dialog"
        // Title is usually "Welcome to PlanterPlan"
        const onboardingModal = page.getByRole('dialog').filter({ hasText: /Welcome to PlanterPlan/i });

        try {
            // Wait a bit for it to appear
            if (await onboardingModal.isVisible({ timeout: 10000 }).catch(() => false)) {

                const skipBtn = onboardingModal.getByRole('button', { name: /Skip/i });
                if (await skipBtn.isVisible({ timeout: 3000 })) {
                    await skipBtn.click();
                    await expect(onboardingModal).not.toBeVisible({ timeout: 5000 });

                } else {

                    await page.keyboard.press('Escape');
                    await expect(onboardingModal).not.toBeVisible({ timeout: 5000 });
                }
            } else {

            }
        } catch (e) {

        }

    }

    test('Owner can create project from template', async ({ page }) => {
        await handleLogin(page);


        // Wait for dashboard to be ready (empty state or list)
        await expect(page.getByRole('heading', { name: /Dashboard|No projects yet/i }).first()).toBeVisible({ timeout: 15000 });

        // Target the specific button based on state
        let newProjectBtn;
        if (await page.getByText(/No projects yet/i).isVisible()) {

            newProjectBtn = page.getByRole('button', { name: /Create Your First Project/i });
        } else {

            newProjectBtn = page.getByRole('button', { name: /New Project/i }).first();
        }

        await expect(newProjectBtn).toBeVisible({ timeout: 15000 });

        await newProjectBtn.click();



        const dialog = page.getByRole('dialog').filter({ hasText: /Choose a Template|Project Details/i });
        await expect(dialog).toBeVisible({ timeout: 15000 });
        await expect(dialog.getByText(/Choose a Template/i)).toBeVisible({ timeout: 10000 });

        // Select "Launch Large" template
        const templateSelection = page.getByRole('button').filter({ hasText: /Launch Large/i }).first();
        await expect(templateSelection).toBeVisible({ timeout: 10000 });
        await templateSelection.click({ force: true });

        // Wait for transition to Project Details
        await expect(dialog.getByText(/Project Details/i)).toBeVisible({ timeout: 10000 });

        const nameInput = page.locator('input#title');
        await expect(nameInput).toBeVisible({ timeout: 15000 });
        await nameInput.fill('PlanterPlan Template Proj');

        // Select Date
        await page.getByRole('button', { name: /Pick a date/i }).click();
        // Wait for calendar popover to be visible
        await expect(page.getByRole('grid')).toBeVisible({ timeout: 5000 });

        const today = new Date().getDate().toString();


        // Multi-strategy click
        const dayButton = page.getByRole('button', { name: today, exact: true }).or(page.getByRole('gridcell', { name: today, exact: true }));

        if (await dayButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await dayButton.first().click({ force: true });
        } else {

            await page.getByText(today, { exact: true }).first().click({ force: true });
        }



        const createBtn = dialog.getByRole('button', { name: /Create Project|Launch/i });
        await expect(createBtn).toBeEnabled({ timeout: 10000 });
        await createBtn.click();

        // Should navigate to project board
        await expect(page).toHaveURL(/\/project\/[a-zA-Z0-9-]+/, { timeout: 30000 });
    });

    test.fixme('Owner can create project without a template (from scratch)', async ({ page }) => {
        await handleLogin(page);


        // Wait for dashboard to be ready (empty state or list)
        await expect(page.getByRole('heading', { name: /Dashboard|No projects yet/i }).first()).toBeVisible({ timeout: 15000 });

        // Target the specific button based on state
        let newProjectBtn;
        if (await page.getByText(/No projects yet/i).isVisible()) {

            newProjectBtn = page.getByRole('button', { name: /Create Your First Project/i });
        } else {

            newProjectBtn = page.getByRole('button', { name: /New Project/i }).first();
        }

        await expect(newProjectBtn).toBeVisible({ timeout: 15000 });
        await newProjectBtn.click();

        const dialog = page.getByRole('dialog').filter({ hasText: /Choose a Template|Project Details/i });
        await expect(dialog).toBeVisible({ timeout: 15000 });


        const projectName = `Scratch Project ${Date.now()}`;
        const scratchNameInput = page.locator('input#title');

        // If still on Step 1 (templates), we might need to select one to proceed to Step 2
        if (!(await scratchNameInput.isVisible().catch(() => false))) {


            // 1. Verify we are on Step 1
            await expect(page.getByText('Choose a Template')).toBeVisible();

            // 2. Select "Start from scratch"
            const scratchBtn = page.getByRole('button').filter({ hasText: /Start from scratch/i }).first();
            await expect(scratchBtn).toBeVisible();
            await scratchBtn.scrollIntoViewIfNeeded();


            const btnHandle = await scratchBtn.elementHandle();
            if (btnHandle) {
                await btnHandle.evaluate((node) => (node as HTMLElement).click());
            } else {
                throw new Error('Scratch button handle not found');
            }

            // 3. Wait for Header Transition (Critical Step)

            await expect(page.getByRole('heading', { name: 'Project Details' })).toBeVisible({ timeout: 15000 });
        }

        await expect(scratchNameInput).toBeVisible({ timeout: 15000 });
        await scratchNameInput.fill(projectName);

        await page.getByRole('button', { name: /Pick a date/i }).click();
        await expect(page.getByRole('grid')).toBeVisible({ timeout: 5000 });
        const scratchToday = new Date().getDate().toString();
        await page.getByRole('button', { name: scratchToday, exact: true }).or(page.getByRole('gridcell', { name: scratchToday, exact: true })).first().click();

        const createBtn = page.getByRole('button', { name: /Create Project|Submit/i });
        await expect(createBtn).toBeEnabled({ timeout: 5000 });
        await createBtn.click();

        await expect(page).toHaveURL(/\/project\/[a-zA-Z0-9-]+/, { timeout: 30000 });

    });
});
