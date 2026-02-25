import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planter } from '@/shared/api/planterClient';
import { useToast } from '@/shared/ui/use-toast';
import type { Database } from '@/shared/db/database.types';

type TeamMemberRow = Database['public']['Tables']['project_members']['Row'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];

export function useTeam(projectId: string | null) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: project } = useQuery<ProjectRow>({
        queryKey: ['project', projectId],
        queryFn: () => planter.entities.Project.filter({ id: projectId }).then((res: ProjectRow[]) => res[0]),
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
            toast({ title: 'Member removed successfully' });
        },
    });

    const addMemberMutation = useMutation({
        mutationFn: (data: { project_id: string | null, name: string, email: string, role: string }) => planter.entities.TeamMember.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamMembers', projectId || 'all'] });
            toast({ title: 'Member added successfully' });
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
