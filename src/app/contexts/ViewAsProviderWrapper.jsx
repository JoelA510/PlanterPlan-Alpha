/**
 * ViewAsProviderWrapper.jsx
 * 
 * Wraps ViewAsProvider with user role detection.
 * Checks if current user has admin privileges and provides appropriate role.
 */

import { useAuth } from '@app/contexts/AuthContext';
import { ViewAsProvider } from '@app/contexts/ViewAsContext';
import { ROLES } from '@app/constants/index';

/**
 * Known admin emails (from schema.sql admin function)
 * In production, this should come from user metadata or a database query.
 */
const ADMIN_EMAILS = [
    'joel@namb.net',
    'joela510@gmail.com',
    'timothy.cheung58@gmail.com',
];

/**
 * Determines user's global role for View-As purposes.
 * Falls back to VIEWER if not authenticated.
 */
function getUserGlobalRole(user) {
    if (!user) return ROLES.VIEWER;

    // Check if user is a global admin
    if (ADMIN_EMAILS.includes(user.email)) {
        return ROLES.ADMIN;
    }

    // Default to OWNER for authenticated users (they own their own projects)
    // In a more sophisticated system, this could check user_metadata
    return ROLES.OWNER;
}

export default function ViewAsProviderWrapper({ children }) {
    const { user } = useAuth();
    const userRole = getUserGlobalRole(user);

    return (
        <ViewAsProvider userRole={userRole}>
            {children}
        </ViewAsProvider>
    );
}
