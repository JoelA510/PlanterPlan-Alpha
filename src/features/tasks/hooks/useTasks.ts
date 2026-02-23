import { useQuery } from '@tanstack/react-query';
import { planter } from '@/shared/api/planterClient';

export function useRootTasks() {
    return useQuery({
        queryKey: ['tasks', 'root'],
        queryFn: async () => {
            const data = await planter.entities.Task.filter({ parent_task_id: null });
            // Sort by created_at descending
            return (data || []).sort((a: { created_at: string }, b: { created_at: string }) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        }
    });
}

import { supabase } from '@/shared/db/client';

export function useTaskTree(rootId: string | null) {
    return useQuery({
        queryKey: ['projectHierarchy', rootId],
        queryFn: async () => {
            if (!rootId) return [];

            const { data, error } = await supabase.rpc('get_task_tree' as any, {
                p_root_id: rootId
            });

            if (error) {
                console.error("[useTaskTree] RPC Error:", error);
                throw error;
            }

            return data || [];
        },
        enabled: !!rootId
    });
}
