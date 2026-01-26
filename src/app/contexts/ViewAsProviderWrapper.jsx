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
 * Determines user's global role for View-As purposes.
 * Falls back to VIEWER if not authenticated.
 */
function getUserGlobalRole(user) {
    if (!user) return ROLES.VIEWER;

    // Check if user has admin role (now enriched by AuthContext from DB)
    if (user.role === ROLES.ADMIN) {
        return ROLES.ADMIN;
    }

    // Default to OWNER for authenticated users (they own their own projects)
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
