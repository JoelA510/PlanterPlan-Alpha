/**
 * ThemeContext.jsx
 * 
 * Provides dark mode support across the application.
 * Persists preference to localStorage and syncs with system preference.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const ThemeContext = createContext(undefined);

const STORAGE_KEY = 'planterplan-theme';

/**
 * @typedef {'light' | 'dark' | 'system'} ThemePreference
 */

/**
 * @typedef {Object} ThemeContextValue
 * @property {ThemePreference} theme - User's theme preference
 * @property {'light' | 'dark'} resolvedTheme - Actual applied theme
 * @property {(theme: ThemePreference) => void} setTheme - Set theme preference
 * @property {() => void} toggleTheme - Toggle between light and dark
 */

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(STORAGE_KEY) || 'system';
        }
        return 'system';
    });

    // Track system preference for reactivity
    const [systemPreference, setSystemPreference] = useState(() => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    });

    // Derive resolved theme from preference and system (no setState in effect)
    const resolvedTheme = useMemo(() => {
        return theme === 'system' ? systemPreference : theme;
    }, [theme, systemPreference]);

    // Apply theme class to document
    useEffect(() => {
        const root = document.documentElement;
        if (resolvedTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [resolvedTheme]);

    // Listen for system preference changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            setSystemPreference(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const setTheme = useCallback((newTheme) => {
        setThemeState(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
    }, []);

    const toggleTheme = useCallback(() => {
        const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    }, [resolvedTheme, setTheme]);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Hook to access theme context
 * @returns {ThemeContextValue}
 */
export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export default ThemeContext;

