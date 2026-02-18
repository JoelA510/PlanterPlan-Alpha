import { useQuery } from '@supabase-cache-helpers/postgrest-react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/db/client'

export function useProjectMembers(projectId: string | null) {
    const targetId = projectId ?? '00000000-0000-0000-0000-000000000000'

    const query = supabase
        .from('project_members')
        .select('*')
        .eq('project_id', targetId)

    return useQuery(query, {
        enabled: !!projectId
    })
}

export function useInviteMember() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ projectId, email }: { projectId: string, email: string }) => {
            const { data, error } = await supabase.rpc('invite_user_to_project', {
                p_project_id: projectId,
                p_email: email,
                p_role: 'member' // Default role
            })
            if (error) throw error
            return data
        },
        onSuccess: () => {
            // Invalidate generically to be safe
            queryClient.invalidateQueries()
        }
    })
}
