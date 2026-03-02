import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/app/contexts/AuthContext';
import { vi } from 'vitest';
import type { User } from '@/shared/db/app.types';

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
    route?: string;
    authContextValue?: Partial<{
        user: User | null;
        loading: boolean;
        signIn: ReturnType<typeof vi.fn>;
        signOut: ReturnType<typeof vi.fn>;
        signUp: ReturnType<typeof vi.fn>;
    }>;
}

/**
 * Custom render function that wraps components with necessary providers for testing.
 */
export const renderWithProviders = (
    ui: React.ReactElement,
    {
        route = '/',
        authContextValue = {},
        ...renderOptions
    }: RenderWithProvidersOptions = {}
) => {
    const defaultAuth = {
        user: { id: 'test-user', email: 'test@example.com', role: 'owner' as const } as User,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
        ...authContextValue,
    };

    const Wrapper = ({ children }: { children: React.ReactNode }) => {
        return (
            <AuthContext.Provider value={defaultAuth}>
                <MemoryRouter initialEntries={[route]}>
                    {children}
                </MemoryRouter>
            </AuthContext.Provider>
        );
    };

    return {
        user: defaultAuth.user,
        ...render(ui, { wrapper: Wrapper, ...renderOptions })
    };
};

export { AuthContext };
