import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/app/contexts/AuthContext';
import { vi } from 'vitest';

/**
 * Custom render function that wraps components with necessary providers for testing.
 * @param {React.ReactElement} ui - The component to render.
 * @param {Object} options - Custom options for rendering.
 * @param {string} options.route - The initial route for MemoryRouter.
 * @param {Object} options.authContextValue - Custom value for AuthContext.
 */
export const renderWithProviders = (
    ui,
    {
        route = '/',
        authContextValue = {},
        ...renderOptions
    } = {}
) => {
    const defaultAuth = {
        user: { id: 'test-user', email: 'test@example.com' },
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
        ...authContextValue,
    };

    const Wrapper = ({ children }) => {
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

// Export context objects if tests need to import the exact same context to check calls
// In a real app, strict import paths would be required.
export { AuthContext };
