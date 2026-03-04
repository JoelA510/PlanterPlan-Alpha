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
    return useQuery<UserProfile>({
        queryKey: ['currentUser'],
        queryFn: () => planter.auth.me(),
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false,
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation<UserProfile, Error, UpdateUserData>({
        mutationFn: (data: UpdateUserData) => planter.auth.updateMe(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
    });
}
