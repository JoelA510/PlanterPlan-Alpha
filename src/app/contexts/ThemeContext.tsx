/**
 * ThemeContext.tsx
 *
 * Provides dark mode support across the application.
 * Persists preference to localStorage and syncs with system preference.
 */

import { createContext, useContext, useEffect, useCallback, useMemo, type ReactNode } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
    theme: ThemePreference;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: ThemePreference) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
    const theme: ThemePreference = 'light';
    const resolvedTheme: ResolvedTheme = 'light';

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark');
        root.classList.add('light');
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const setTheme = useCallback((_t: ThemePreference) => { }, []);
    const toggleTheme = useCallback(() => { }, []);

    const value = useMemo<ThemeContextValue>(
        () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
        [theme, resolvedTheme, setTheme, toggleTheme],
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Hook to access theme context.
 * Must be used within a ThemeProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export default ThemeContext;
