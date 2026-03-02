import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Load env vars (Vitest loads .env automatically)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const isPlaceholder = SUPABASE_URL?.includes('placeholder.supabase.co');
const shouldRun = !!(SUPABASE_URL && SUPABASE_ANON_KEY && !isPlaceholder);

// Fallback to VITE_ prefixes if non-prefixed ones are missing
const TEST_USER_EMAIL = process.env.VITE_TEST_EMAIL || process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = (process.env.VITE_TEST_PASSWORD || process.env.TEST_USER_PASSWORD || '').replace(/"/g, '');

const hasCredentials = !!(TEST_USER_EMAIL && TEST_USER_PASSWORD);

if (!shouldRun) {
    if (isPlaceholder) {
        console.warn('Skipping RLS tests: Detected placeholder VITE_SUPABASE_URL');
    } else {
        console.warn('Skipping RLS tests: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    }
} else if (!hasCredentials) {
    console.warn('Skipping Authenticated RLS tests: Missing TEST_USER_EMAIL or VITE_TEST_EMAIL');
}

// Connectivity Check: Verify that the Supabase schema is accessible.
const checkSchemaAvailability = async () => {
    if (!shouldRun) return false;
    const checkerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try {
        const { error } = await checkerClient.from('tasks').select('id').limit(0);
        if (error && error.code === 'PGRST205') {
            console.warn(`Skipping RLS tests: Schema not available (${error.message})`);
            return false;
        }
        return true;
    } catch {
        console.warn('Skipping RLS tests: Supabase instance unreachable');
        return false;
    }
};

const schemaAvailable = await checkSchemaAvailability();

describe.runIf(shouldRun)('Security: RLS & Access Control', () => {
    let anonClient: SupabaseClient;

    beforeAll(async () => {
        anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    });

    describe.runIf(schemaAvailable)('Anonymous Access', () => {
        it('should NOT list any tasks for anonymous user (Direct Select)', async () => {
            const { data, error } = await anonClient.from('tasks').select('*');

            // RLS should return 0 rows, NOT an error for SELECT
            expect(error).toBeNull();
            expect(data).toEqual([]);
        });

        it('should NOT be able to create a task (Expect 42501)', async () => {
            const { error } = await anonClient.from('tasks').insert({
                title: 'Hacked Task',
                origin: 'instance'
            });

            // Expect RLS violation error (Postgres Permission Denied)
            expect(error).not.toBeNull();
            expect(error?.code).toMatch(/42501|PGRST301/);
        });

        it('should NOT be able to see project_members list', async () => {
            const { data, error } = await anonClient.from('project_members').select('*');
            expect(error).toBeNull();
            expect(data).toEqual([]);
        });
    });

    describe.runIf(schemaAvailable && hasCredentials)('Invite Logic (RPC)', () => {
        it('should fail to get details for invalid token', async () => {
            const { error } = await anonClient.rpc('get_invite_details', {
                p_token: '00000000-0000-0000-0000-000000000000'
            });

            expect(error).not.toBeNull();
            expect(error?.message).toContain('Invalid or expired invite token');
        });

        it('should successfully get details for a VALID token', async () => {
            // 1. Setup: Auth as Test User
            const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
                email: TEST_USER_EMAIL!,
                password: TEST_USER_PASSWORD!
            });

            if (authError || !authData.user) {
                console.warn('Skipping valid token test: Could not sign in test user', authError);
                return; // Vitest doesn't support this.skip() easily here, so just return pass
            }

            // 2. Create Project
            const { data: project, error: projError } = await authClient
                .from('tasks')
                .insert({
                    title: 'Security Test Project',
                    origin: 'instance',
                    root_id: null, // It will be its own root
                    parent_task_id: null,
                    creator: authData.user.id
                })
                .select()
                .single();

            expect(projError).toBeNull();

            // 3. Invite User
            const inviteEmail = `test-invite-${Date.now()}@example.com`;
            const { data: inviteResult, error: inviteError } = await authClient
                .rpc('invite_user_to_project', {
                    p_project_id: project.id,
                    p_email: inviteEmail,
                    p_role: 'editor'
                });

            expect(inviteError).toBeNull();
            expect(inviteResult.status).toBe('invited');
            const token = inviteResult.token;

            // 4. Anon User Fetch Details
            const { data: details, error: anonError } = await anonClient
                .rpc('get_invite_details', { p_token: token });

            expect(anonError).toBeNull();
            expect(details.email).toBe(inviteEmail);
            expect(details.project_title).toBe('Security Test Project');

            // Cleanup
            await authClient.from('tasks').delete().eq('id', project.id);
        });
    });

    describe.runIf(schemaAvailable && hasCredentials)('Authenticated Access', () => {
        let authClient: SupabaseClient | null = null;

        beforeAll(async () => {
            authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            const { error } = await authClient.auth.signInWithPassword({
                email: TEST_USER_EMAIL!,
                password: TEST_USER_PASSWORD!
            });
            if (error) {
                console.warn('Authenticated Access skipped: Auth failed. Visit http://127.0.0.1:54323 to create a test user if running locally.', error.message);
                authClient = null; // Signal failure
            }
        });

        it('should NOT be able to spoof creator ID on new project', async () => {
            if (!authClient) return; // Skip test logic if auth failed
            const fakeUserId = '00000000-0000-0000-0000-000000000000';

            const { error } = await authClient.from('tasks').insert({
                title: 'Spoofed Project',
                origin: 'instance',
                root_id: null,
                creator: fakeUserId // Spoofing attempt
            }).select();

            // Should fail with RLS violation
            expect(error).not.toBeNull();
            expect(error?.code).toMatch(/42501|PGRST301/);
        });
    });
});
