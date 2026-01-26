/**
 * ViewAsContext.jsx
 * 
 * Provides "View As" role switching for privileged users.
 * Allows ADMIN/OWNER to preview the app as other roles.
 * 
 * Rules:
 * - Only ADMIN and OWNER can use View-As
 * - Stored in session (not localStorage) to prevent lock-in
 * - effectiveRole is what other components should use for permission checks
 */

import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { ROLES } from '@app/constants/index';

const ViewAsContext = createContext(undefined);

/**
 * Roles that can use the View-As feature
 */
const PRIVILEGED_ROLES = [ROLES.ADMIN, ROLES.OWNER];

/**
 * Roles available to view as
 */
const VIEWABLE_ROLES = [
    { value: ROLES.ADMIN, label: 'Admin' },
    { value: ROLES.OWNER, label: 'Owner' },
    { value: ROLES.EDITOR, label: 'Editor' },
    { value: ROLES.COACH, label: 'Coach' },
    { value: ROLES.LIMITED, label: 'Limited' },
    { value: ROLES.VIEWER, label: 'Viewer' },
];

/**
 * @typedef {Object} ViewAsContextValue
 * @property {string} actualRole - User's real role
 * @property {string | null} viewingAs - Role being viewed as (null = actual role)
 * @property {string} effectiveRole - The role to use for permission checks
 * @property {boolean} canViewAs - Whether user can use View-As feature
 * @property {Array} availableRoles - Roles user can view as
 * @property {(role: string | null) => void} setViewingAs - Set viewing role
 * @property {() => void} resetViewAs - Reset to actual role
 */

export function ViewAsProvider({ children, userRole = ROLES.VIEWER }) {
    const [viewingAs, setViewingAsState] = useState(null);

    const canViewAs = useMemo(() => {
        return PRIVILEGED_ROLES.includes(userRole);
    }, [userRole]);

    const effectiveRole = useMemo(() => {
        if (viewingAs && canViewAs) {
            return viewingAs;
        }
        return userRole;
    }, [viewingAs, canViewAs, userRole]);

    const availableRoles = useMemo(() => {
        if (!canViewAs) return [];
        // Admin can view as any role; Owner can view as roles below them
        if (userRole === ROLES.ADMIN) {
            return VIEWABLE_ROLES;
        }
        if (userRole === ROLES.OWNER) {
            return VIEWABLE_ROLES.filter(r => r.value !== ROLES.ADMIN);
        }
        return [];
    }, [canViewAs, userRole]);

    const setViewingAs = useCallback((role) => {
        if (!canViewAs) return;
        setViewingAsState(role);
    }, [canViewAs]);

    const resetViewAs = useCallback(() => {
        setViewingAsState(null);
    }, []);

    const value = useMemo(() => ({
        actualRole: userRole,
        viewingAs,
        effectiveRole,
        canViewAs,
        availableRoles,
        setViewingAs,
        resetViewAs,
    }), [userRole, viewingAs, effectiveRole, canViewAs, availableRoles, setViewingAs, resetViewAs]);

    return (
        <ViewAsContext.Provider value={value}>
            {children}
        </ViewAsContext.Provider>
    );
}

/**
 * Hook to access View-As context
 * @returns {ViewAsContextValue}
 */
export function useViewAs() {
    const context = useContext(ViewAsContext);
    if (context === undefined) {
        throw new Error('useViewAs must be used within a ViewAsProvider');
    }
    return context;
}

export { VIEWABLE_ROLES, PRIVILEGED_ROLES };
export default ViewAsContext;
