import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planter } from '@/shared/api/planterClient';

/** User profile data returned by the API. */
interface UserProfile {
 id: string;
 email: string;
 full_name?: string | null;
 avatar_url?: string | null;
 role?: string;
}

/** Data shape for updating the current user. */
interface UpdateUserData {
 full_name?: string;
 avatar_url?: string;
 [key: string]: unknown;
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

export function useUpdateUser() {
 const queryClient = useQueryClient();

 return useMutation<UserProfile, Error, UpdateUserData>({
 mutationFn: async (data: UpdateUserData) => {
 const user = await planter.auth.updateMe(data as Record<string, unknown>);
 return {
 id: user.id,
 email: user.email || '',
 full_name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || null,
 avatar_url: (user.user_metadata?.avatar_url as string) || null,
 };
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['currentUser'] });
 },
 });
}
