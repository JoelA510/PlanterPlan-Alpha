import { useEffect, useRef } from 'react';
import { supabase } from '@/shared/db/client';
import { useQueryClient } from '@tanstack/react-query';

export const useTaskSubscription = ({
    projectId,
    refreshProjectDetails,
}) => {
    const queryClient = useQueryClient();
    const lastUpdateRef = useRef(0);

    useEffect(() => {
        if (!projectId) return;


        const channel = supabase
            .channel(`project-tasks:${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                },
                (payload) => {
                    const now = Date.now();
                    // Debounce bursts (e.g. cascade updates)
                    if (now - lastUpdateRef.current < 500) return;
                    lastUpdateRef.current = now;

                    const record = payload.new || payload.old;

                    // Logic to check if this task is relevant to the *current* project
                    // We only care if:
                    // 1. It IS the project itself
                    // 2. Its root_id matches the project
                    // 3. It belongs to a template being used (less common in this view)

                    const isRelevant =
                        record.id === projectId ||
                        record.root_id === projectId ||
                        record.parent_task_id === projectId; // Direct child

                    if (isRelevant) {
                        // Invalidate specific project queries
                        queryClient.invalidateQueries({ queryKey: ['projectHierarchy', projectId] });

                        // If it changed metadata that affects the header (name, dates), refresh project too
                        if (record.id === projectId || !record.root_id) {
                            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
                            if (refreshProjectDetails) refreshProjectDetails(projectId);
                        }
                    }
                }
            )
            .subscribe((status, err) => {
                if (err) {
                    console.error('[useTaskSubscription] Channel error:', err);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [projectId, queryClient, refreshProjectDetails]);
};
