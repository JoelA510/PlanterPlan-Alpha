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

export function useTaskTree(rootId: string | null) {
    return useQuery({
        queryKey: ['tasks', 'tree', rootId],
        queryFn: async () => {
            if (!rootId) return [];

            const [children, root] = await Promise.all([
                planter.entities.Task.filter({ root_id: rootId }),
                planter.entities.Task.get(rootId)
            ]);

            const allTasks = [...(children || [])];
            if (root && !allTasks.some((t: { id: string }) => t.id === root.id)) {
                allTasks.push(root);
            }

            // sort by position ascending
            return allTasks.sort((a: { position?: number }, b: { position?: number }) => (a.position || 0) - (b.position || 0));
        },
        enabled: !!rootId
    });
}
