import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, AuthContext } from '../../app/contexts/AuthContext';
import { supabase } from '../../app/supabaseClient';
import React, { useContext } from 'react';

// Mock Supabase
vi.mock('../../app/supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            onAuthStateChange: vi.fn(),
        },
        rpc: vi.fn(),
    }
}));

// Helper component to expose context
const TestComponent = () => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div>Loading...</div>;
    return <div data-testid="user-role">{user?.role || 'null'}</div>;
};

describe('AuthContext Security Fallback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default auth setup
        supabase.auth.onAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } }
        });
    });

    it('Should default to "viewer" role if supabase.rpc throws error', async () => {
        // Mock Session
        supabase.auth.getSession.mockResolvedValue({
            data: { session: { user: { id: 'user-123', email: 'test@example.com' } } },
            error: null
        });

        // Mock RPC Error (The Vulnerability Condition)
        supabase.rpc.mockResolvedValue({
            data: null,
            error: { message: 'Network Error', code: '500' }
        });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

        // ASSERT: Must be 'viewer', NOT 'owner' or 'admin'
        expect(screen.getByTestId('user-role')).toHaveTextContent('viewer');
    });

    it('Should default to "viewer" role if supabase.rpc crashes/throws exception', async () => {
        // Mock Session
        supabase.auth.getSession.mockResolvedValue({
            data: { session: { user: { id: 'user-123', email: 'test@example.com' } } },
            error: null
        });

        // Mock RPC Throwing
        supabase.rpc.mockRejectedValue(new Error('Unexpected Crash'));

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

        // ASSERT
        expect(screen.getByTestId('user-role')).toHaveTextContent('viewer');
    });

    it('Should not default to "owner" on network failure', async () => {
        // Mock Session
        supabase.auth.getSession.mockResolvedValue({
            data: { session: { user: { id: 'user-123', email: 'test@example.com' } } },
            error: null
        });

        // Mock RPC Error pretending to be network issue
        supabase.rpc.mockResolvedValue({
            data: null,
            error: { message: 'Failed to fetch', hinted: 'Check connection' }
        });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

        // ASSERT
        expect(screen.getByTestId('user-role')).toHaveTextContent('viewer');
    });
});
