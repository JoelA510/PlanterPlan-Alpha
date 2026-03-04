import { test } from '@playwright/test';
import { OWNER_ID, createSession, setupAuthenticatedState, setupCommonMocks } from '../fixtures/e2e-helpers';
import { ProjectPage } from '../poms/ProjectPage';

/**
 * Task Management Journey E2E Test
 *
 * IMPORTANT: Route matching order matters!
 * 'root_id=eq.X' contains 'id=eq.X' as substring — always check root_id FIRST.
 */

test.describe('Journey: Task Management', () => {
    const ownerSession = createSession('OWNER', OWNER_ID);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function setupMembersMock(page: any, ...projectIds: string[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.route('**/rest/v1/project_members*', (route: any) => {
            const members = projectIds.map(pid => ({ project_id: pid, user_id: OWNER_ID, role: 'owner' }));
            return route.fulfill({ status: 200, body: JSON.stringify(members) });
        });
    }

    test('Owner can create a new task', async ({ page }) => {
        test.setTimeout(60000);
        const projectId = '00000000-0000-0000-0000-000000000040';
        const projectData = { id: projectId, title: 'Test Project', name: 'Test Project', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const testProjectTasks: any[] = [
            { id: '40000000-0000-0000-0000-000000000001', title: 'Phase 1', status: 'not_started', parent_task_id: projectId, root_id: projectId, position: 1000, creator: OWNER_ID },
            { id: '40000000-0000-0000-0000-000000000002', title: 'Milestone 1', status: 'not_started', parent_task_id: '40000000-0000-0000-0000-000000000001', root_id: projectId, position: 1000, creator: OWNER_ID },
            { id: '40000000-0000-0000-0000-000000000003', title: 'Pre-existing Task', status: 'todo', parent_task_id: '40000000-0000-0000-0000-000000000002', root_id: projectId, position: 1000, creator: OWNER_ID }
        ];

        await setupCommonMocks(page, ownerSession);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.route('**/rest/v1/tasks*', async (route: any) => {
            const url = route.request().url();
            const method = route.request().method();

            if (method === 'GET') {
                if (url.includes('root_id=eq.')) {
                    return route.fulfill({ status: 200, body: JSON.stringify(testProjectTasks) });
                }
                if (url.includes(`id=eq.${projectId}`) || url.includes('origin=eq.instance')) {
                    return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
                }
                return route.continue();
            }

            if (method === 'POST') {
                const postData = route.request().postDataJSON();
                const newTask = {
                    id: '40000000-0000-0000-0000-000000000004',
                    title: postData.title,
                    status: 'todo',
                    root_id: projectId,
                    parent_task_id: postData.parent_task_id || '40000000-0000-0000-0000-000000000002',
                    position: 5000,
                    creator: OWNER_ID
                };
                testProjectTasks.push(newTask);
                return route.fulfill({ status: 201, body: JSON.stringify([newTask]) });
            }
            return route.fulfill({ body: '[]' });
        });

        await setupMembersMock(page, projectId);
        await setupAuthenticatedState(page, ownerSession);

        const projectPage = new ProjectPage(page);
        await projectPage.goto(projectId);

        await projectPage.verifyProjectLoaded('Test Project');
        // Await other components implicitly loaded
        await projectPage.verifyTaskVisible('Phase 1');
        await projectPage.verifyTaskVisible('Pre-existing Task');

        await projectPage.openAddTaskModal();
        await projectPage.fillAndSubmitTask('Validated New Task');

        await projectPage.verifyTaskVisible('Validated New Task');
    });

    test('Owner can change task status', async ({ page }) => {
        test.setTimeout(60000);
        const projectId = '00000000-0000-0000-0000-000000000041';
        const projectData = { id: projectId, title: 'Status Project', name: 'Status Project', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };
        const tasksData = [
            { id: '41000000-0000-0000-0000-000000000001', title: 'Phase 1', root_id: projectId, parent_task_id: projectId, status: 'not_started', creator: OWNER_ID },
            { id: '41000000-0000-0000-0000-000000000002', title: 'Milestone 1', root_id: projectId, parent_task_id: '41000000-0000-0000-0000-000000000001', status: 'not_started', creator: OWNER_ID },
            { id: '41000000-0000-0000-0000-000000000003', title: 'Mutable Task', root_id: projectId, parent_task_id: '41000000-0000-0000-0000-000000000002', status: 'todo', position: 1000, creator: OWNER_ID }
        ];

        await setupCommonMocks(page, ownerSession);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.route('**/rest/v1/tasks*', async (route: any) => {
            const url = route.request().url();
            const method = route.request().method();

            if (method === 'GET') {
                if (url.includes('root_id=eq.')) {
                    return route.fulfill({ status: 200, body: JSON.stringify(tasksData) });
                }
                if (url.includes(`id=eq.${projectId}`) || url.includes('origin=eq.instance')) {
                    return route.fulfill({ status: 200, body: JSON.stringify([projectData]) });
                }
                return route.continue();
            }

            if (method === 'PATCH') {
                const postData = route.request().postDataJSON();
                const task = tasksData.find(t => url.includes(`id=eq.${t.id}`));
                if (task && postData.status) task.status = postData.status;
                return route.fulfill({ status: 200, body: JSON.stringify([{ id: '41000000-0000-0000-0000-000000000003', ...postData }]) });
            }
            return route.fulfill({ body: '[]' });
        });

        await setupMembersMock(page, projectId);
        await setupAuthenticatedState(page, ownerSession);

        const projectPage = new ProjectPage(page);
        await projectPage.goto(projectId);

        await projectPage.verifyTaskVisible('Mutable Task');
        await projectPage.changeTaskStatus('41000000-0000-0000-0000-000000000003', 'in_progress');
    });

    test('Project Isolation: Tasks do not leak between projects', async ({ page }) => {
        test.setTimeout(60000);
        const p1Id = '42000000-0000-0000-0000-000000000001';
        const p2Id = '43000000-0000-0000-0000-000000000001';
        const p1Data = { id: p1Id, title: 'Project 1', name: 'Project 1', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };
        const p2Data = { id: p2Id, title: 'Project 2', name: 'Project 2', creator: OWNER_ID, status: 'active', created_at: new Date().toISOString() };

        await setupCommonMocks(page, ownerSession);

        await page.route('**/rest/v1/tasks*', async (route) => {
            const url = route.request().url();
            if (url.includes(`root_id=eq.${p1Id}`)) return route.fulfill({ body: JSON.stringify([{ id: '42000000-0000-0000-0000-000000000002', title: 'Unique Task A', root_id: p1Id, parent_task_id: p1Id, creator: OWNER_ID }]) });
            if (url.includes(`root_id=eq.${p2Id}`)) return route.fulfill({ body: JSON.stringify([{ id: '43000000-0000-0000-0000-000000000002', title: 'Unique Task B', root_id: p2Id, parent_task_id: p2Id, creator: OWNER_ID }]) });
            if (url.includes(`id=eq.${p1Id}`)) return route.fulfill({ body: JSON.stringify([p1Data]) });
            if (url.includes(`id=eq.${p2Id}`)) return route.fulfill({ body: JSON.stringify([p2Data]) });
            if (url.includes('origin=eq.instance')) return route.fulfill({ body: JSON.stringify([p1Data, p2Data]) });
            return route.fulfill({ body: '[]' });
        });

        await setupMembersMock(page, p1Id, p2Id);
        await setupAuthenticatedState(page, ownerSession);

        const projectPage = new ProjectPage(page);

        await projectPage.goto(p1Id);
        await projectPage.verifyTaskVisible('Unique Task A');
        await projectPage.verifyTaskNotVisible('Unique Task B');

        await projectPage.goto(p2Id);
        await projectPage.verifyTaskVisible('Unique Task B');
        await projectPage.verifyTaskNotVisible('Unique Task A');
    });
});
