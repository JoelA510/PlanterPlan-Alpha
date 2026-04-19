import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/db/client';

/**
 * Subscribes to a per-task `task_comments` realtime channel and invalidates
 * the `['taskComments', taskId]` React Query cache on any postgres change.
 *
 * The channel is scoped per-task (not per-project) so `TaskDetailsView`
 * only receives traffic for the open task — `Project.tsx`'s project-wide
 * channel covers `tasks` mutations and explicitly does NOT merge comment
 * events (see that file for the reminder).
 *
 * Invalidation is intentionally coarse: the realtime payload doesn't
 * include the `author` join, so merging inline would lose author info.
 * The refetch is cheap and always returns a fully-hydrated row.
 *
 * @param taskId The task whose comments we're listening to. `null` is a
 *   no-op (so the hook can be called unconditionally at the top of
 *   `TaskComments` regardless of whether a task is selected).
 */
export function useTaskCommentsRealtime(taskId: string | null): void {
    const qc = useQueryClient();

    useEffect(() => {
        if (!taskId) return;

        const channel = supabase
            .channel(`task_comments:task=${taskId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` },
                () => {
                    qc.invalidateQueries({ queryKey: ['taskComments', taskId] });
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [taskId, qc]);
}
