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
    // Force light mode for Gold Master simplification
    const theme = 'light';
    const resolvedTheme = 'light';

    // No-op for setting theme
    const setTheme = useCallback(() => { }, []);
    const toggleTheme = useCallback(() => { }, []);

    // Ensure dark class is removed
    useEffect(() => {
        document.documentElement.classList.remove('dark');
    }, []);

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

