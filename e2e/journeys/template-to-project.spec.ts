import { test, expect } from '@playwright/test';
import { OWNER_ID, createSession, setupCommonMocks, setupAuthenticatedState } from '../fixtures/e2e-helpers';

test.describe('Journey: Template to Project Instantiation', () => {
    test.setTimeout(300000); // 5 minutes

    const ownerSession = createSession('OWNER', OWNER_ID);

    test.beforeEach(async ({ page }) => {
        // --- Network Mocks ---
        await setupCommonMocks(page, ownerSession);
        await page.route('**/rest/v1/rpc/is_admin', route => route.fulfill({ status: 200, body: 'true' }));

        // Data Mocks
        // Mock Project Creation (which hits /tasks in PlanterClient)
        await page.route('**/rest/v1/tasks*', async route => {
            const method = route.request().method();
            const url = route.request().url();
            console.log(`[MOCK] ${method} ${url}`);

            if (method === 'POST') {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify([{
                        id: 'new-project-id-123',
                        title: 'PlanterPlan Template Proj',
                        creator: OWNER_ID,
                        origin: 'instance',
                        parent_task_id: null,
                        created_at: new Date().toISOString()
                    }])
                });
            } else {
                // Default for other /tasks requests to avoid fallthrough
                if (!route.request().url().includes('eq.new-project-id-123')) {
                    await route.fulfill({ status: 200, body: JSON.stringify([]) });
                }
            }
        });

        await page.route('**/rest/v1/projects*', route => route.fulfill({ status: 200, body: JSON.stringify([]) }));
        await page.route('**/rest/v1/team_members*', route => route.fulfill({ status: 200, body: '[]' }));
        await page.route('**/rest/v1/project_members*', route => route.fulfill({ status: 200, body: '[]' }));

        // Project Creation Mocks
        await page.route('**/rest/v1/rpc/initialize_default_project', route => route.fulfill({ status: 200, body: '{}' }));
    });

    async function handleLogin(page) {
        console.log('[E2E] Starting handleLogin...');
        await setupAuthenticatedState(page, ownerSession);

        console.log('[E2E] Navigating to /dashboard...');
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        console.log('[E2E] Current URL:', page.url());

        // Press Escape to clear any potential lingering modals
        await page.keyboard.press('Escape');

        // Wait for dashboard or empty state
        console.log('[E2E] Waiting for Dashboard markers...');
        const dashboardMarker = page.getByText(/Dashboard|No projects yet/i).first();
        await expect(dashboardMarker).toBeVisible({ timeout: 20000 });
        console.log('[E2E] Dashboard markers visible.');

        // --- Handle Onboarding Modal ---
        const onboardingModal = page.getByRole('dialog').filter({ hasText: /Welcome to PlanterPlan|Onboarding/i });

        if (await onboardingModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            const skipBtn = onboardingModal.getByRole('button', { name: /Skip/i });
            if (await skipBtn.isVisible({ timeout: 2000 })) {
                await skipBtn.click();
            } else {
                await page.keyboard.press('Escape');
            }
            await expect(onboardingModal).not.toBeVisible({ timeout: 5000 });
        }
    }

    test('Owner can create project from template', async ({ page }) => {
        // Mock initial projects to avoid Onboarding Wizard
        const initialProject = {
            id: 'existing-id',
            title: 'Existing Project',
            name: 'Existing Project',
            root_id: null,
            parent_task_id: null,
            status: 'active',
            creator: OWNER_ID
        };

        // Update the tasks?origin=eq.instance mock to return this project
        await page.route(url => url.toString().includes('tasks') && url.toString().includes('origin=eq.instance') && !url.toString().includes('id=eq.'), route => {
            return route.fulfill({ status: 200, body: JSON.stringify([initialProject]) });
        });

        await setupAuthenticatedState(page, ownerSession);
        await page.goto('/dashboard');

        // Click New Project (now visible since project list is not empty)
        const newProjectBtn = page.getByRole('button', { name: /New Project/i }).first();
        await expect(newProjectBtn).toBeVisible({ timeout: 15000 });
        await newProjectBtn.click();

        const dialog = page.getByRole('dialog');
        await expect(dialog.filter({ hasText: /Choose a Template/i })).toBeVisible({ timeout: 15000 });

        // Select "Launch Large" template
        const templateSelection = dialog.getByRole('button').filter({ hasText: /Launch Large/i }).first();
        await expect(templateSelection).toBeVisible({ timeout: 10000 });
        await templateSelection.click({ force: true });

        // Wait for transition to Project Details
        await expect(page.getByRole('heading', { name: /Project Details/i })).toBeVisible({ timeout: 15000 });

        // Use ID-based locator for maximum reliability
        const nameInput = page.locator('#title').first();
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



        await page.route(/\/rest\/v1\/tasks.*root_id=eq\.new-project-id-123/, async route => {
            const projectRoot = {
                id: 'new-project-id-123',
                title: 'PlanterPlan Template Proj',
                root_id: 'new-project-id-123',
                parent_task_id: null
            };
            const phase = {
                id: 'phase-1',
                title: 'Discovery',
                parent_task_id: 'new-project-id-123',
                root_id: 'new-project-id-123',
                position: 0
            };
            const milestone = {
                id: 'milestone-1',
                title: 'Personal Assessment',
                parent_task_id: 'phase-1',
                root_id: 'new-project-id-123',
                due_date: new Date().toISOString()
            };

            return route.fulfill({
                status: 200,
                body: JSON.stringify([projectRoot, phase, milestone])
            });
        });

        // Mock the Project Metadata fetch (GET by ID)
        // Ensure we don't match root_id=eq... by using (?<!root_) if supported or [?&]id=eq
        await page.route(/\/rest\/v1\/tasks.*[?&]id=eq\.new-project-id-123/, async route => {
            const projectRoot = {
                id: 'new-project-id-123',
                title: 'PlanterPlan Template Proj',
                name: 'PlanterPlan Template Proj', // Mapped
                root_id: 'new-project-id-123',
                parent_task_id: null,
                status: 'planning', // Required via props
                created_at: new Date().toISOString()
            };
            return route.fulfill({
                status: 200,
                body: JSON.stringify([projectRoot])
            });
        });

        const createBtn = dialog.getByRole('button', { name: /Create Project|Launch/i });
        await expect(createBtn).toBeEnabled({ timeout: 10000 });
        await createBtn.click();

        // Should navigate to project board
        await expect(page).toHaveURL(/\/project\/[a-zA-Z0-9-]+/, { timeout: 30000 });

        // Wait for board to load
        await expect(page.getByText('Discovery').first()).toBeVisible({ timeout: 20000 });
        await expect(page.getByText('Personal Assessment').first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('No milestones in this phase yet')).not.toBeVisible();
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
