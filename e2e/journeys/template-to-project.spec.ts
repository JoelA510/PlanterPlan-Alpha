import { test } from '@playwright/test';
import { OWNER_ID, createSession, setupCommonMocks, setupAuthenticatedState } from '../fixtures/e2e-helpers';
import { ProjectPage } from '../poms/ProjectPage';
import { DashboardPage } from '../poms/DashboardPage';

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

        await page.route(url => url.toString().includes('tasks') && url.toString().includes('origin=eq.instance') && !url.toString().includes('id=eq.'), route => {
            return route.fulfill({ status: 200, body: JSON.stringify([initialProject]) });
        });

        await setupAuthenticatedState(page, ownerSession);

        const dashboardPage = new DashboardPage(page);
        const projectPage = new ProjectPage(page);

        await dashboardPage.goto();
        await dashboardPage.verifyDashboardLoaded();

        await dashboardPage.startNewProject();
        await dashboardPage.selectTemplate('Launch Large');

        await dashboardPage.fillProjectDetailsAndSubmit('PlanterPlan Template Proj');

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

        // Should navigate to project board
        await projectPage.verifyProjectUrl();
        await projectPage.verifyTaskVisible('Discovery');
        await projectPage.verifyTaskVisible('Personal Assessment');
        await projectPage.verifyTaskNotVisible('No milestones in this phase yet');
    });

    test.fixme('Owner can create project without a template (from scratch)', async ({ page }) => {
        await setupAuthenticatedState(page, ownerSession);

        const dashboardPage = new DashboardPage(page);
        const projectPage = new ProjectPage(page);

        await dashboardPage.goto();
        await dashboardPage.handleOnboardingModal();
        await dashboardPage.verifyDashboardLoaded();

        await dashboardPage.startNewProject();

        const projectName = `Scratch Project ${Date.now()}`;
        const scratchNameInput = dashboardPage.projectNameInput;

        // If still on Step 1 (templates), we might need to select one to proceed to Step 2
        if (!(await scratchNameInput.isVisible().catch(() => false))) {
            await dashboardPage.startFromScratch();
        }

        await dashboardPage.fillProjectDetailsAndSubmit(projectName);
        await projectPage.verifyProjectUrl();
    });
});
