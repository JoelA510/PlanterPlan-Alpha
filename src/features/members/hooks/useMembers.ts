import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planter } from '@/shared/api/planterClient';

export function useProjectMembers(projectId: string | null) {
    return useQuery({
        queryKey: ['project_members', projectId],
        queryFn: async () => {
            if (!projectId) return [];
            return await planter.entities.TeamMember.filter({ project_id: projectId });
        },
        enabled: !!projectId
    });
}

export function useInviteMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ projectId, email }: { projectId: string; email: string }) => {
            const { data, error } = await planter.entities.Project.addMemberByEmail(projectId, email, 'member');
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            // Invalidate generically to be safe
            queryClient.invalidateQueries();
        }
    });
}
