import { supabase } from '@/shared/db/client';
import type { UserRole } from '@/shared/db/app.types';

export const authApi = {
    /** Checks if a user has admin privileges via the is_admin RPC. */
    async checkIsAdmin(userId: string): Promise<boolean> {
        const { data, error } = await supabase.rpc('is_admin', { p_user_id: userId });
        if (error) {
            console.error('[AuthApi] is_admin RPC failed:', error);
            return false;
        }
        return !!data;
    },

    /** Safely extracts the role from Supabase user metadata as a temporary fallback. */
    extractRoleFromMetadata(metadata: Record<string, unknown> | undefined): UserRole {
        const role = metadata?.role;
        if (role === 'admin' || role === 'owner' || role === 'viewer') {
            return role as UserRole;
        }
        return 'viewer';
    }
};
