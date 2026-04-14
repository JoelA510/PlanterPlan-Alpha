import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planter } from '@/shared/api/planterClient';
import { toast } from 'sonner';

import type { Task as ProjectRow, TeamMemberRow } from '@/shared/db/app.types';
import type { Database } from '@/shared/db/database.types';
import { useAuth } from '@/shared/contexts/AuthContext';

export function useTeam(projectId: string | null) {
    const queryClient = useQueryClient();

    const { user: currentUser } = useAuth();

    const { data: project } = useQuery<ProjectRow>({
        queryKey: ['project', projectId],
        queryFn: () => planter.entities.Project.get(projectId!).then(res => res as ProjectRow),
        enabled: !!projectId,
    });

    const { data: teamMembers = [], isLoading } = useQuery<TeamMemberRow[]>({
        queryKey: ['teamMembers', projectId || 'all'],
        queryFn: () => {
            if (projectId) {
                return planter.entities.TeamMember.filter({ project_id: projectId });
            } else {
                // Fetch all members from all projects the user has access to
                return planter.entities.TeamMember.list();
            }
        },
    });

    const deleteMemberMutation = useMutation({
        mutationFn: (id: string) => planter.entities.TeamMember.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamMembers', projectId || 'all'] });
            toast.success('Member removed successfully');
        },
    });

    const addMemberMutation = useMutation({
        mutationFn: (data: { project_id: string | null, name: string, email: string, role: string }) => {
            if (!currentUser?.id) throw new Error('User not authenticated');
            return planter.entities.TeamMember.create({
                user_id: currentUser.id,
                project_id: data.project_id!,
                role: data.role,
            } as Database['public']['Tables']['project_members']['Insert']);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamMembers', projectId || 'all'] });
            toast.success('Member added successfully');
        },
    });

    return {
        project,
        teamMembers,
        isLoading,
        mutations: {
            deleteMember: deleteMemberMutation,
            addMember: addMemberMutation,
        }
    };
}
