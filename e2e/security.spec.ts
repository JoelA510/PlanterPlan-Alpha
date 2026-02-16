import { test, expect } from '@playwright/test';
import { signJWT } from './fixtures/e2e-helpers';

test.describe('Security: RLS Enforcement', () => {

    test('Anonymous user cannot access tasks via REST API', async ({ request }) => {
        // Suppress console logs in the runner unless we fail
        // Fetch URL and Key from env
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        let anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

        // If the anon key is in the 'sb_publishable_' format, PostgREST might reject it
        // unless it's sent along with a valid JWT. For local testing, we prefer a signed JWT.
        if (anonKey.startsWith('sb_') || !anonKey.includes('.')) {
            // Sign a local anon JWT using the known secret (matches local supabase default)
            anonKey = signJWT({
                role: 'anon',
                iss: 'supabase',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600
            });
        }

        const response = await request.get(`${supabaseUrl}/rest/v1/tasks`, {
            headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`
            }
        });

        if (!response.ok()) {
            const body = await response.text();
            console.error(`Security Test Failed: Status ${response.status()}, Body: ${body}`);
            console.log(`URL: ${supabaseUrl}/rest/v1/tasks`);
        }

        expect(response.ok()).toBeTruthy();
        const tasks = await response.json();

        // ASSERTION: Anonymous user should see ZERO tasks due to RLS
        expect(tasks.length).toBe(0);
    });
});
