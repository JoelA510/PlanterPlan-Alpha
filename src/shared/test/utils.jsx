import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../app/contexts/AuthContext';
import ThemeContext from '../../app/contexts/ThemeContext';
// Providers: AuthContext + ThemeContext. Toast uses sonner (no context needed).

/**
 * Custom render function that wraps the UI in necessary providers.
 * 
 * @param {React.ReactElement} ui - The component to render.
 * @param {Object} options - Custom options.
 * @param {Object} options.authContextValue - Overrides for AuthContext.
 * @param {Object} options.themeContextValue - Overrides for ThemeContext.
 * @param {string} options.route - Initial route for MemoryRouter.
 * @returns {Object} Result from RTL's render.
 */
export const renderWithProviders = (
    ui,
    {
        authContextValue = {},
        themeContextValue = {},
        route = '/',
        ...renderOptions
    } = {}
) => {
    // Default Mock Values
    const defaultAuth = {
        user: { id: 'test-user-id', email: 'test@example.com', role: 'owner' },
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
        ...authContextValue,
    };

    const defaultTheme = {
        theme: 'light',
        resolvedTheme: 'light',
        setTheme: vi.fn(),
        toggleTheme: vi.fn(),
        ...themeContextValue,
    };

    const Wrapper = ({ children }) => {
        return (
            <MemoryRouter initialEntries={[route]}>
                <AuthContext.Provider value={defaultAuth}>
                    <ThemeContext.Provider value={defaultTheme}>
                        {children}
                    </ThemeContext.Provider>
                </AuthContext.Provider>
            </MemoryRouter>
        );
    };

    return {
        user: defaultAuth.user,
        ...render(ui, { wrapper: Wrapper, ...renderOptions })
    };
};

// Export context objects if tests need to import the exact same context to check calls
// In a real app, strict import paths would be required.
// For now, these generic exports allow the `health.test.jsx` to verify the provider hierarchy works.
export const TestContexts = {
    AuthContext,
    ThemeContext
};
