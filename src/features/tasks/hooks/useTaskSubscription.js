import { useEffect, useRef } from 'react';
import { supabase } from '@app/supabaseClient';

export const useTaskSubscription = ({
    refreshProjectDetails,
    fetchProjects,
    findTask,
    currentUserId,
}) => {
    // Use a ref to debounce updates or track last update time if needed.
    // For now, strict invalidation.

    useEffect(() => {
        if (!currentUserId) return;

        const channel = supabase
            .channel('public:tasks')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                },
                async (payload) => {
                    // console.log('Realtime Event:', payload);
                    const { eventType, new: newRecord, old: oldRecord } = payload;

                    // Determine which project this affects.
                    // 1. Root Project Updates (No parent)
                    const record = newRecord || oldRecord;
                    const parentId = record?.parent_task_id;

                    if (!parentId) {
                        // It's a root project or template
                        // We should refresh the main project list
                        fetchProjects(1); // Refresh page 1 for now (simplest)
                        if (record?.id) {
                            // Also refresh details if we happen to be viewing it?
                            refreshProjectDetails(record.id);
                        }
                        return;
                    }

                    // 2. Child Task Updates
                    // We need to find the root_id to refresh the correct container.
                    // We try to find the parent in our local cache to get the lineage.
                    // If we can't find it, we might be stale, so maybe refresh global?

                    // Try to find the *parent* to get the root. 
                    // Note: findTask searchs instanceTasks, templateTasks, and hydratedProjects.
                    const parent = findTask(parentId);
                    const rootId = parent?.root_id || parent?.id;

                    if (rootId) {
                        // It belongs to a loaded project
                        // Debounce usage in production, but here we just call it.
                        refreshProjectDetails(rootId);
                    } else {
                        // If we can't find the context, it might be a new task in a project we haven't loaded,
                        // or we are just missing data.
                        // If it's a collaborative app, maybe we should fetchProjects?
                        // But if we are looking at Project A, and someone edits Project B, we don't care (unless we are looking at list).

                        // If we are looking at the list, fetchProjects is relevant.
                        fetchProjects(1);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, fetchProjects, refreshProjectDetails, findTask]);
};
