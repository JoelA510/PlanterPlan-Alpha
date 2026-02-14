import { test, expect } from '@playwright/test';
import { OWNER_ID, createSession, setupAuthenticatedState, setupCommonMocks } from '../fixtures/e2e-helpers';

test.describe('Journey: Project Management', () => {

    const ownerSession = createSession('OWNER', OWNER_ID);

    test.beforeEach(async ({ page }) => {
        await setupCommonMocks(page, ownerSession);
    });

    test('Owner can update project settings', async ({ page }) => {
        const projectId = 'mgmt-project-id';
        const projectData = [{ id: projectId, title: 'Manageable Project', owner_id: OWNER_ID, creator: OWNER_ID }];
        const membersData = [{ project_id: projectId, user_id: OWNER_ID, role: 'owner' }];

        await page.route('**/rest/v1/tasks*', async route => {
            const method = route.request().method();
            if (method === 'GET' && route.request().url().includes('parent_task_id=is.null'))
                return route.fulfill({ body: JSON.stringify(projectData) });

            if (method === 'PATCH') {
                const postData = route.request().postDataJSON();
                if (postData.title === 'Updated Title') {
                    return route.fulfill({ status: 200, body: JSON.stringify([{ ...projectData[0], title: 'Updated Title' }]) });
                }
            }
            return route.fulfill({ body: '[]' });
        });
        await page.route('**/rest/v1/project_members*', async route => route.fulfill({ body: JSON.stringify(membersData) }));

        await setupAuthenticatedState(page, ownerSession);
        await page.goto(`/project/${projectId}/settings`);

        await expect(page.getByLabel(/Project Name/i)).toHaveValue('Manageable Project');

        await page.getByLabel(/Project Name/i).fill('Updated Title');
        await page.getByRole('button', { name: /Save/i }).click();

        await expect(page.getByText('Settings saved')).toBeVisible();
    });

    test('Owner can delete project', async ({ page }) => {
        const projectId = 'del-project-id';
        const projectData = [{ id: projectId, title: 'Deletable Project', owner_id: OWNER_ID, creator: OWNER_ID }];
        const membersData = [{ project_id: projectId, user_id: OWNER_ID, role: 'owner' }];
        let deleted = false;

        await page.route('**/rest/v1/tasks*', async route => {
            const method = route.request().method();
            if (method === 'DELETE') {
                deleted = true;
                return route.fulfill({ status: 204 });
            }
            if (method === 'GET') return route.fulfill({ body: JSON.stringify(projectData) });
            return route.fulfill({ body: '[]' });
        });
        await page.route('**/rest/v1/project_members*', async route => route.fulfill({ body: JSON.stringify(membersData) }));

        await setupAuthenticatedState(page, ownerSession);
        await page.goto(`/project/${projectId}/settings`);

        // Find Delete Button (often in Danger Zone)
        const deleteBtn = page.getByRole('button', { name: /Delete Project/i });
        await deleteBtn.scrollIntoViewIfNeeded();
        await deleteBtn.click();

        // Confirm
        await page.getByRole('button', { name: /Confirm|Delete|Yes/i }).last().click();

        // Should return to dashboard
        await expect(page).toHaveURL(/dashboard/);

        // Verify DELETE was actually called
        expect(deleted).toBe(true);
    });

});
