
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../app/contexts/AuthContext';
import { supabase } from '../../app/supabaseClient';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('../../app/supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            signUp: vi.fn(),
            signInWithPassword: vi.fn(),
            signOut: vi.fn(),
        },
        rpc: vi.fn(),
    },
}));

const TestComponent = () => {
    const { user } = useAuth();
    if (!user) return <div>No User</div>;
    return <div>User Role: {user.role}</div>;
};

describe('AuthContext Security', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should NOT default to owner when RPC checks fail', async () => {
        // Mock successful session
        const mockUser = { id: 'test-user-id', email: 'test@example.com' };
        supabase.auth.getSession.mockResolvedValue({
            data: { session: { user: mockUser } },
            error: null,
        });

        // Mock RPC FAILURE (Reject)
        supabase.rpc.mockRejectedValue(new Error('RPC Failed'));

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Initial check (might be No User while loading)
        // Wait for role to appear
        await waitFor(() => {
            const roleElement = screen.getByText(/User Role:/);
            // The vulnerability is that it defaults to 'owner'
            // We WANT this test to Fail if the vulnerability exists, OR pass if we write it as "expect vulnerability"
            // The Plan says: "**Assert:** user.role MUST NOT be 'owner'. (This test should FAIL currently)."
            expect(roleElement.textContent).not.toBe('User Role: owner');
        });
    });
});
