import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/db/client';
import { useAuth } from '@/app/contexts/AuthContext';

/**
 * Hook to subscribe to real-time changes for tasks within a specific project context.
 * 
 * @param {string} projectId - Optional project ID to filter events (if not provided, listens to all task changes if RLS permits)
 */
export const useProjectRealtime = (projectId = null) => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;

    useEffect(() => {
        // Create a unique channel per scope to avoid collisions
        const channelName = projectId ? `db-changes:project-${projectId}` : 'db-changes:global';
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    // Filter by project if provided.
                    // If projectId is null, we scope it to the current creator to avoid global noise.
                    filter: projectId ? `root_id=eq.${projectId}` : (userId ? `creator=eq.${userId}` : undefined)
                },
                (payload) => {
                    console.log('[Realtime] Task Change detected:', payload);
                    // Granular Invalidation: Invalidate specific tree or task if possible
                    const changedTask = payload.new || payload.old;
                    if (changedTask) {
                        if (changedTask.root_id) {
                            queryClient.invalidateQueries({ queryKey: ['tasks', 'tree', changedTask.root_id] });
                        }
                        if (changedTask.id) {
                            queryClient.invalidateQueries({ queryKey: ['task', changedTask.id] });
                        }
                    }

                    // Fallback for list views
                    queryClient.invalidateQueries({ queryKey: ['tasks', 'root'] });
                    queryClient.invalidateQueries({ queryKey: ['projects'] });
                    // Also invalidate specific project if needed
                    if (projectId) {
                        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, projectId]);
};
