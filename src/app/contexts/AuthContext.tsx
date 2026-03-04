/**
 * Re-export from canonical location.
 * The AuthContext now lives in @/shared/contexts/ per FSD compliance.
 * This re-export exists for backwards compatibility with app/ layer files
 * that use relative imports.
 */
export { AuthProvider, AuthContext, useAuth } from '@/shared/contexts/AuthContext';
