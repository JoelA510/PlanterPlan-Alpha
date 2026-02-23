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
    // Force light theme and remove system preference tracking to simplify UI
    const theme = 'light';
    const resolvedTheme = 'light';

    // Ensure document never has 'dark' class
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark');
        localStorage.setItem(STORAGE_KEY, 'light');
    }, []);

    const setTheme = useCallback(() => { }, []);
    const toggleTheme = useCallback(() => { }, []);

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

