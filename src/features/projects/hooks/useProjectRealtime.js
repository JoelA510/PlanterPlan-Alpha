import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@app/supabaseClient';

/**
 * Hook to subscribe to real-time changes for tasks within a specific project context.
 * 
 * @param {string} projectId - Optional project ID to filter events (if not provided, listens to all task changes if RLS permits)
 */
export const useProjectRealtime = (projectId = null) => {
    const queryClient = useQueryClient();

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
                    // Note: Supabase Realtime filters are limited. 'root_id' equality is good.
                    // If projectId is null, we might over-subscribe, but RLS usually filters rows for us? 
                    // Actually Realtime respects RLS if configured with "Walrus" (Postgres changes).
                    // But usually we want client-side filter or server-side filter string.
                    filter: projectId ? `root_id=eq.${projectId}` : undefined
                },
                (payload) => {
                    console.log('[Realtime] Task Change detected:', payload);
                    // Invalidate queries to trigger refetch
                    queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
