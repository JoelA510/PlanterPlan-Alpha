import { test, expect } from '@playwright/test';
import { OWNER_ID, createSession, setupAuthenticatedState, setupCommonMocks } from '../fixtures/e2e-helpers';

test.describe('Journey: Project Management', () => {

    const ownerSession = createSession('OWNER', OWNER_ID);

    test.beforeEach(async ({ page }) => {
        await setupCommonMocks(page, ownerSession);
    });

    test('Owner can update project settings', async ({ page }) => {
        const projectId = 'mgmt-project-id';
        const projectData = [{
            id: projectId,
            title: 'Manageable Project',
            name: 'Manageable Project', // Mapped from title by PostgREST select
            owner_id: OWNER_ID,
            creator: OWNER_ID,
            root_id: projectId,
            parent_task_id: null,
            status: 'planning', // Required by ProjectHeader
            created_at: new Date().toISOString() // Required for start_date validation in Settings
        }];
        const membersData = [{ project_id: projectId, user_id: OWNER_ID, role: 'owner' }];

        await page.route('**/rest/v1/tasks*', async route => {
            const method = route.request().method();
            const url = route.request().url();

            // Handle both Project Metadata fetch (typically by ID) and Hierarchy fetch (by root_id)
            if (method === 'GET') {
                if (url.includes('parent_task_id=is.null') ||
                    url.includes(`root_id=eq.${projectId}`) ||
                    url.includes(`id=eq.${projectId}`)) {
                    return route.fulfill({ body: JSON.stringify(projectData) });
                }
            }

            if (method === 'PATCH') {
                const postData = route.request().postDataJSON();
                if (postData.title === 'Updated Title') {
                    // Update in-memory mock for subsequent fetches
                    projectData[0].title = 'Updated Title';
                    projectData[0].name = 'Updated Title'; // Sync mapped field
                    return route.fulfill({ status: 200, body: JSON.stringify([projectData[0]]) });
                }
            }
            return route.fulfill({ body: '[]' });
        });
        await page.route('**/rest/v1/project_members*', async route => route.fulfill({ body: JSON.stringify(membersData) }));

        await setupAuthenticatedState(page, ownerSession);

        // 1. Go to Project Board
        await page.goto(`/project/${projectId}`);
        try {
            await expect(page.getByRole('heading', { name: /Manageable Project/i })).toBeVisible({ timeout: 10000 });
        } catch (e) {
            console.log('--- PAGE CONTENT DUMP ---');
            console.log(await page.content());
            throw e; // Re-throw to fail test
        }

        // 2. Open Settings Modal
        await page.getByRole('button', { name: /Settings/i }).click({ force: true });
        const modal = page.getByRole('dialog', { name: /Project Settings/i });
        await expect(modal).toBeVisible();

        // 3. Update Title
        const titleInput = modal.getByLabel(/Project Title/i);
        await expect(titleInput).toHaveValue('Manageable Project');
        await titleInput.fill('Updated Title');

        // 4. Save
        await modal.getByRole('button', { name: /Save Changes/i }).click();

        // 5. Verify Toast/Update
        // Since we mocked PATCH to update projectData, the header should update if it refetches or optimistically updates
        // But for now just checking the toast or that modal closes
        await expect(modal).not.toBeVisible();
        await expect(page.getByRole('heading', { name: /Updated Title/i })).toBeVisible();
    });

    test('Owner can delete project', async ({ page }) => {
        const projectId = 'del-project-id';
        const projectData = [{ id: projectId, title: 'Deletable Project', owner_id: OWNER_ID, creator: OWNER_ID, root_id: projectId, parent_task_id: null }];
        const membersData = [{ project_id: projectId, user_id: OWNER_ID, role: 'owner' }];
        let deleted = false;

        await page.route('**/rest/v1/tasks*', async route => {
            const method = route.request().method();
            if (method === 'DELETE') {
                deleted = true;
                return route.fulfill({ status: 204 });
            }
            if (method === 'GET') {
                if (route.request().url().includes('parent_task_id=is.null') || route.request().url().includes(`root_id=eq.${projectId}`)) {
                    return route.fulfill({ body: JSON.stringify(projectData) });
                }
            }
            return route.fulfill({ body: '[]' });
        });
        await page.route('**/rest/v1/project_members*', async route => route.fulfill({ body: JSON.stringify(membersData) }));

        await setupAuthenticatedState(page, ownerSession);
        await page.goto(`/project/${projectId}`);

        // Open Settings
        await page.getByRole('button', { name: /Settings/i }).click({ force: true });
        const modal = page.getByRole('dialog', { name: /Project Settings/i });

        // Click Delete
        await modal.getByRole('button', { name: /Delete Project/i }).click();

        // Start Delete Flow
        // const initialDeleteBtn = modal.getByRole('button', { name: /Delete Project/i }).first();
        // Wait, EditProjectModal has a "Delete Project" button that reveals confirmation
        // But getByRole might find multiple? One in Danger Zone, one triggers confirm.

        // Ensure we target the right one
        // The modal code:
        // Button "Delete Project" (triggers confirm)
        // If confirm: Text "Are you sure?", Button "Cancel", Button "Yes, Delete"

        // Let's rely on text more specifically if needed
        // The first click reveals confirm.
        // It seems I might have clicked it already in step above?
        // await modal.getByRole('button', { name: /Delete Project/i }).click(); <-- This clicks the triggering button

        // Now find the confirm button. Text is "Yes, Delete" (variant destructive)
        await modal.getByRole('button', { name: /Yes, Delete/i }).click();

        // Should redirect to dashboard
        // Should redirect to dashboard (visible content check)
        await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible();

        // Verify DELETE was actually called
        expect(deleted).toBe(true);
    });

});
