import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthContext, AuthProvider } from '../../app/contexts/AuthContext';
import ViewAsProviderWrapper from '../../app/contexts/ViewAsProviderWrapper';
import React, { useEffect } from 'react';
import { supabase } from '../../app/supabaseClient';

// Mock Supabase
vi.mock('../../app/supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            getUser: vi.fn(),
            onAuthStateChange: vi.fn(),
            signInWithPassword: vi.fn(),
            signOut: vi.fn(),
        },
        rpc: vi.fn(),
    }
}));

// Component that counts renders to detect loops
const RenderCounter = () => {
    const count = React.useRef(0);
    count.current++;

    if (count.current > 50) {
        throw new Error('Infinite Loop Detected in RenderCounter');
    }
    return <div data-testid="render-count">{count.current}</div>;
};

describe('AuthContext Stability', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default successful session
        supabase.auth.getSession.mockResolvedValue({
            data: { session: { user: { id: 'u1', role: 'authenticated' } } },
            error: null
        });
        supabase.auth.onAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } }
        });
        supabase.rpc.mockResolvedValue({ data: false, error: null }); // Not admin
    });

    it('should not infinite loop when AuthProvider and ViewAsProviderWrapper are combined', async () => {
        // Setup a mock auth state change sequence if needed
        // For now, just rendering them together is the test

        await act(async () => {
            render(
                <AuthProvider>
                    <ViewAsProviderWrapper>
                        <RenderCounter />
                    </ViewAsProviderWrapper>
                </AuthProvider>
            );
        });

        // Wait for potential loops to crash
        await waitFor(() => expect(screen.getByTestId('render-count')).toBeInTheDocument());

        // Assert count is reasonable (React StrictMode double render + updates = ~4-6)
        const count = parseInt(screen.getByTestId('render-count').textContent);
        expect(count).toBeLessThan(20);
    });

    it('handles rpc failure without looping', async () => {
        // Simulate RPC failure which triggers fallback logic in AuthContext
        supabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC Failed' } });

        await act(async () => {
            render(
                <AuthProvider>
                    <ViewAsProviderWrapper>
                        <RenderCounter />
                    </ViewAsProviderWrapper>
                </AuthProvider>
            );
        });

        await waitFor(() => expect(screen.getByTestId('render-count')).toBeInTheDocument());
        const count = parseInt(screen.getByTestId('render-count').textContent);
        expect(count).toBeLessThan(20);
    });
});
