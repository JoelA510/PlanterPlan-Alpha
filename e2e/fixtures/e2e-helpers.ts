import crypto from 'crypto';
import { expect, Page } from '@playwright/test';
import { TEST_USERS } from './test-users';

// ---------------------------------------------------------------------------
// JWT Secret — prefer env-var, fall back to local-dev default
// ---------------------------------------------------------------------------
const SUPABASE_JWT_SECRET =
    process.env.SUPABASE_JWT_SECRET ||
    'super-secret-jwt-token-with-at-least-32-characters-long';

// ---------------------------------------------------------------------------
// Well-known user IDs (stable UUIDs for mock data)
// ---------------------------------------------------------------------------
export const OWNER_ID = '00000000-0000-0000-0000-000000000001';
export const EDITOR_ID = '00000000-0000-0000-0000-000000000002';
export const VIEWER_ID = '00000000-0000-0000-0000-000000000003';

// ---------------------------------------------------------------------------
// signJWT — HMAC-SHA256 JWT signer for test tokens
// ---------------------------------------------------------------------------
export function signJWT(payload: Record<string, unknown>): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encode = (obj: object) =>
        Buffer.from(JSON.stringify(obj))
            .toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    const toSign = `${encode(header)}.${encode(payload)}`;
    const signature = crypto
        .createHmac('sha256', SUPABASE_JWT_SECRET)
        .update(toSign)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    return `${toSign}.${signature}`;
}

// ---------------------------------------------------------------------------
// createSession — build a full Supabase-shaped session object
// ---------------------------------------------------------------------------
export function createSession(
    userKey: keyof typeof TEST_USERS,
    userId: string,
    overrides: Record<string, unknown> = {},
) {
    const user = TEST_USERS[userKey];
    const jwt = signJWT({
        sub: userId,
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
        app_metadata: { provider: 'email' },
        user_metadata: { full_name: `Test ${userKey}` },
        ...overrides,
    });

    return {
        access_token: jwt,
        token_type: 'bearer' as const,
        expires_in: 3600,
        refresh_token: 'fake-refresh-token',
        user: {
            id: userId,
            aud: 'authenticated',
            role: 'authenticated',
            email: user.email,
            app_metadata: { provider: 'email' },
            user_metadata: { full_name: `Test ${userKey}` },
        },
    };
}

// ---------------------------------------------------------------------------
// setupAuthenticatedState — seed the AuthSeeder dev-component
// ---------------------------------------------------------------------------
export async function setupAuthenticatedState(
    page: Page,
    session: ReturnType<typeof createSession>,
) {
    await page.goto('/');
    await expect(page.getByTestId('auth-seeder-active')).toBeAttached({ timeout: 30000 });
    await page.evaluate((s) => {
        window.dispatchEvent(new CustomEvent('SEED_AUTH', { detail: { session: s } }));
    }, session);
    await expect(page.getByTestId('auth-user-seeded')).toBeAttached({ timeout: 40000 });
}

// ---------------------------------------------------------------------------
// setupCommonMocks — register the auth / admin / token route stubs
// ---------------------------------------------------------------------------
export async function setupCommonMocks(
    page: Page,
    session: ReturnType<typeof createSession>,
) {
    await page.route('**/auth/v1/user', (route) =>
        route.fulfill({ status: 200, body: JSON.stringify(session.user) }),
    );
    await page.route('**/auth/v1/session', (route) =>
        route.fulfill({ status: 200, body: JSON.stringify(session) }),
    );
    await page.route('**/auth/v1/token*', (route) =>
        route.fulfill({ status: 200, body: JSON.stringify(session) }),
    );
    await page.route('**/rest/v1/rpc/is_admin', (route) =>
        route.fulfill({ status: 200, body: 'true' }),
    );
}
