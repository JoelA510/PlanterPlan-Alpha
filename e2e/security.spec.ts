import { test, expect } from '@playwright/test';

test.describe('Security: RLS Enforcement', () => {

    test('Anonymous user cannot access tasks via REST API', async ({ request }) => {
        // Attempt to fetch tasks without an Authorization header
        // Supabase (PostgREST) should return 401 Unauthorized OR an empty list if public access is disabled/RLS is on
        // Ideally, we want 401 or RLS filtering to 0 items.

        const response = await request.get(`${process.env.VITE_SUPABASE_URL}/rest/v1/tasks`, {
            headers: {
                // No Authorization header
                'apikey': process.env.VITE_SUPABASE_ANON_KEY || ''
            }
        });

        // If RLS is ON and no policy allows anon select, it returns empty list []
        // If RLS is OFF, it returns ALL tasks (Critical Failure)

        expect(response.ok()).toBeTruthy();
        const tasks = await response.json();

        // ASSERTION: Anonymous user should see ZERO tasks
        expect(tasks.length).toBe(0);
    });

    // TODO: Add authenticated cross-tenant test once we have two test users
});
