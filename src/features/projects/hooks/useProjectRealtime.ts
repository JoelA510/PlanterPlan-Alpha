import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/db/client';
import { useAuth } from '@/app/contexts/AuthContext';

interface RealtimePayload {
    eventType: string;
    new: Record<string, unknown> | null;
    old: Record<string, unknown> | null;
}

/**
 * Hook to subscribe to real-time changes for tasks within a specific project context.
 */
export const useProjectRealtime = (projectId: string | null = null): void => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;

    useEffect(() => {
        const channelName = projectId ? `db-changes:project-${projectId}` : 'db-changes:global';
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: projectId
                        ? `root_id=eq.${projectId}`
                        : userId
                            ? `creator=eq.${userId}`
                            : undefined,
                } as Record<string, unknown>,
                (payload: RealtimePayload) => {
                    console.log('[Realtime] Task Change detected:', payload);
                    const changedTask = (payload.new || payload.old) as Record<string, unknown> | null;
                    if (changedTask) {
                        if (changedTask.root_id) {
                            queryClient.invalidateQueries({ queryKey: ['tasks', 'tree', changedTask.root_id] });
                        }
                        if (changedTask.id) {
                            queryClient.invalidateQueries({ queryKey: ['task', changedTask.id] });
                        }
                    }

                    queryClient.invalidateQueries({ queryKey: ['tasks', 'root'] });
                    queryClient.invalidateQueries({ queryKey: ['projects'] });
                    if (projectId) {
                        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, projectId, userId]);
};
