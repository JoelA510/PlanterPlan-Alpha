import { test, expect, Page } from '@playwright/test';

// 1. Define the "Audit" function we will inject into the browser
async function scanForLightModeLeaks(page: Page, contextName: string) {
    const violations = await page.evaluate(() => {
        const offendingElements: string[] = [];

        // Get all elements
        const allElements = document.querySelectorAll('*');

        allElements.forEach((el) => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            // Filter: Element must be visible
            const isVisible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
            if (!isVisible) return;

            // Filter: Check Background Color
            // We look for pure white (255, 255, 255) or very light slate (e.g., > 240)
            const bgColor = style.backgroundColor; // returns "rgb(r, g, b)" or "rgba(r, g, b, a)"

            // Parse RGB
            const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (rgbMatch) {
                const [_, r, g, b] = rgbMatch.map(Number);

                // HEURISTIC: If it's effectively white/bright in Dark Mode, it's a bug.
                // We allow some transparency, but fully opaque white is usually bad.
                // Adjust threshold as needed (e.g., > 230 is very bright).
                if (r > 240 && g > 240 && b > 240) {
                    // Exclude explicitly allowed 'light' elements if any (e.g., specific badges)
                    // You can add logic here to skip elements with specific data-attributes
                    if (el.getAttribute('data-theme-ignore')) return;

                    // Generate a selector or description for the report
                    const id = el.id ? `#${el.id}` : '';
                    const classes = Array.from(el.classList).join('.');
                    const tag = el.tagName.toLowerCase();
                    offendingElements.push(`${tag}${id}.${classes}`);
                }
            }
        });

        return offendingElements;
    });

    // 2. Assert that no violations were found
    if (violations.length > 0) {
        console.error(`❌ Theme Leaks found in [${contextName}]:`, violations);
    }
    expect(violations, `Found ${violations.length} light-mode elements in Dark Mode on ${contextName}`).toEqual([]);
}

test.describe('Theme Integrity & Dark Mode', () => {

    const projectId = '00000000-0000-0000-0000-000000000001';
    const taskId = '00000000-0000-0000-0000-000000000002';

    // Use existing auth state or login
    test.beforeEach(async ({ page }) => {
        // 1. Force System Preference to Dark
        await page.emulateMedia({ colorScheme: 'dark' });

        // 2. Mock Network Data to ensure elements render
        // Mock User
        await page.route('**/auth/v1/user', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'test-user', email: 'test@example.com', aud: 'authenticated' }) });
        });

        await page.route('**/auth/v1/session', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'fake', user: { id: 'test-user' } }) });
        });

        // Mock Projects
        await page.route('**/rest/v1/projects*', async route => {
            await route.fulfill({
                status: 200, contentType: 'application/json', body: JSON.stringify([
                    { id: projectId, title: 'Theme Test Project', owner_id: 'test-user', creator: 'test-user', status: 'active', root_id: projectId }
                ])
            });
        });

        // Mock Tasks (and Project fetching via Task Entity)
        await page.route('**/rest/v1/tasks*', async route => {
            const url = route.request().url();

            // Case 1: Fetching Project by ID (e.g. ?id=eq.projectId)
            if (url.includes(`id=eq.${projectId}`)) {
                await route.fulfill({
                    status: 200, contentType: 'application/json', body: JSON.stringify([
                        { id: projectId, title: 'Theme Test Project', owner_id: 'test-user', status: 'active', root_id: projectId }
                    ])
                });
                return;
            }

            // Case 2: Fetching Tasks by Root ID (e.g. ?root_id=eq.projectId)
            // or generic fetch.
            await route.fulfill({
                status: 200, contentType: 'application/json', body: JSON.stringify([
                    {
                        id: taskId,
                        title: 'Theme Test Task',
                        status: 'todo',
                        project_id: projectId,
                        root_id: projectId,
                        parent_task_id: projectId,
                        description: 'Testing dark mode',
                        priority: 'high',
                        due_date: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        primary_resource_id: null,
                        actions: 'Step 1\nStep 2',
                        purpose: 'To test theme',
                        notes: 'Some notes'
                    }
                ])
            });
        });

        // Mock Team
        await page.route('**/rest/v1/team_members*', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        });

        // 2. Clear LocalStorage to ensure we use System Preference
        // Need to goto a page first to access localStorage?
        // Actually, we can just goto the target page in the test.
        // But here we want to ensure state.

        // We will skip strict navigation here and let the test handle it,
        // BUT we must ensure the "dark" class is applied.
        // Since ThemeContext syncs with system preference, emulateMedia should work.
        // We verify it IN THE TEST after navigation.
    });

    test('Dashboard should have no light mode leaks', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Verify Dark Mode is active (synced from emulateMedia)
        await expect(page.locator('html')).toHaveClass(/dark/);

        // Run the scan
        await scanForLightModeLeaks(page, 'Dashboard');
    });

    test('Project Board should have no light mode leaks', async ({ page }) => {
        // Direct navigation to project
        await page.goto(`/project/${projectId}`);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('html')).toHaveClass(/dark/);

        await scanForLightModeLeaks(page, 'Project Board');
    });

    test.fixme('Task Details Modal should have no light mode leaks', async ({ page }) => {
        // Go to project
        await page.goto(`/project/${projectId}`);
        await page.waitForLoadState('networkidle');

        // Open a task
        await page.getByTestId('task-card').first().click();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await expect(page.getByRole('dialog')).toBeVisible();

        await scanForLightModeLeaks(page, 'Task Details Modal');
    });
});