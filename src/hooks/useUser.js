import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planter } from '@/api/planterClient';

export function useUser() {
    return useQuery({
        queryKey: ['currentUser'],
        queryFn: () => planter.auth.me(),
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => planter.auth.updateMe(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        }
    });
}
