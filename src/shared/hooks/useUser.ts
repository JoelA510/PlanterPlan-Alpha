import { useQuery } from '@tanstack/react-query';
import { planter } from '@/shared/api/planterClient';

/** User profile data returned by the API. */
interface UserProfile {
 id: string;
 email: string;
 full_name?: string | null;
 avatar_url?: string | null;
 role?: string;
}

export function useUser() {
 return useQuery<UserProfile | null>({
 queryKey: ['currentUser'],
 queryFn: async () => {
 const user = await planter.auth.me();
 if (!user) return null;
 return {
 id: user.id,
 email: user.email || '',
 full_name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || null,
 avatar_url: (user.user_metadata?.avatar_url as string) || null,
 };
 },
 staleTime: 1000 * 60 * 5, // 5 minutes
 retry: false,
 });
}
