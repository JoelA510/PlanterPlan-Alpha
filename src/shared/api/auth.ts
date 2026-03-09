import { supabase } from '@/shared/db/client';

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
};
