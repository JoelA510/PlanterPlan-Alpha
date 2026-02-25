import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/shared/db/client';
import { useAuth } from '@/app/contexts/AuthContext';
import { planter } from '@/shared/api/planterClient';

const PAGE_SIZE = 20;

// Helper to merge new projects avoiding duplicates
const mergeProjects = (existing: any[], newProjs: any[]) => {
    const existingIds = new Set(existing.map((t) => t.id));
    const uniqueNews = newProjs.filter((t) => !existingIds.has(t.id));
    return [...existing, ...uniqueNews];
};

export const useTaskQuery = () => {
    const [tasks, setTasks] = useState<any[]>([]); // Stores Root Projects (Instance) + Templates
    const [hydratedProjects, setHydratedProjects] = useState<Record<string, any[]>>({});
    const [joinedProjects, setJoinedProjects] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joinedError, setJoinedError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const isMountedRef = useRef(false);

    const fetchProjects = useCallback(async (pageNum = 1) => {
        if (!isMountedRef.current) return;
        if (pageNum === 1) setLoading(true);
        else setIsFetchingMore(true);

        setError(null);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!isMountedRef.current) return;
            if (!user) {
                setError('User not authenticated');
                setTasks([]);
                return;
            }
            setCurrentUserId(user.id);

            // Fetch User Projects (Instances, Paginated)
            const projects = await planter.entities.Project.listByCreator(
                user.id,
                pageNum,
                PAGE_SIZE
            );

            // Fetch Templates (Safe Raw Fetch logic)
            let templates: any[] = [];
            try {
                const { data } = await supabase
                    .from('tasks_with_primary_resource')
                    .select('*')
                    .eq('creator', user.id)
                    .eq('origin', 'template')
                    .is('parent_task_id', null)
                    .order('title', { ascending: true });
                templates = data || [];
            } catch (e: any) {
                if (e.name !== 'AbortError') console.error('Template fetch error', e);
            }

            if (!isMountedRef.current) return;

            const newProjects = projects || [];
            const newTemplates = templates || [];

            setTasks((prev) => {
                if (pageNum === 1) return [...newProjects, ...newTemplates];
                return mergeProjects(prev, newProjects);
            });

            setPage(pageNum);
            setHasMore(newProjects.length === PAGE_SIZE);

            // Fetch Joined Projects (only on first load)
            if (pageNum === 1) {
                try {
                    const joinedData = await planter.entities.Project.listJoined(user.id);
                    if (isMountedRef.current) {
                        setJoinedProjects(joinedData || []);
                    }
                } catch (joinedProjectError) {
                    if (isMountedRef.current) setJoinedError('Failed to load joined projects');
                }
            }
        } catch (err: any) {
            if (!isMountedRef.current) return;
            if (err.name === 'AbortError') {
                console.warn('Fetch projects aborted (harmless)');
            } else {
                console.error('Fetch projects exception:', err);
                setError('Failed to fetch projects');
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
                setIsFetchingMore(false);
            }
        }
    }, []);

    const loadMoreProjects = useCallback(() => {
        if (hasMore && !isFetchingMore) {
            fetchProjects(page + 1);
        }
    }, [hasMore, isFetchingMore, page, fetchProjects]);

    const fetchProjectDetails = useCallback(
        async (projectId: string) => {
            if (hydratedProjects[projectId]) return;
            try {
                const { data: descendants, error } = await planter.entities.Task.fetchChildren(projectId);
                if (error) throw error;

                // Store flattened children
                const children = descendants.filter((t: any) => t.id !== projectId);

                setHydratedProjects((prev) => ({ ...prev, [projectId]: children }));
                return children;
            } catch (err) {
                console.error('Failed to hydrate project:', err);
            }
        },
        [hydratedProjects]
    );

    const refreshProjectDetails = useCallback(async (projectId: string) => {
        try {
            const { data: descendants, error } = await planter.entities.Task.fetchChildren(projectId);
            if (error) throw error;
            const children = descendants.filter((t: any) => t.id !== projectId);

            setHydratedProjects((prev) => ({ ...prev, [projectId]: children }));
        } catch (err) {
            console.error('Failed to refresh project:', err);
        }
    }, []);

    const fetchTasks = useCallback(() => fetchProjects(1), [fetchProjects]);

    const findTask = useCallback(
        (id: string) => {
            if (!id) return null;
            const inRoots = tasks.find((t) => t.id === id) || joinedProjects.find((t) => t.id === id);
            if (inRoots) return inRoots;

            for (const projTasks of Object.values(hydratedProjects)) {
                const found = projTasks.find((t) => t.id === id);
                if (found) return found;
            }
            return null;
        },
        [tasks, joinedProjects, hydratedProjects]
    );

    const { user: authUser, loading: authLoading } = useAuth();

    useEffect(() => {
        isMountedRef.current = true;
        if (!authLoading && authUser) {
            if (authUser.id === currentUserId) return;
            setCurrentUserId(authUser.id);
            fetchProjects(1);
        }
        return () => {
            isMountedRef.current = false;
        };
    }, [fetchProjects, authLoading, authUser, currentUserId]);

    const commitOptimisticUpdate = useCallback(
        async (taskId: string) => {
            const task = findTask(taskId);
            if (task) {
                const rootId =
                    task.root_id || (task.parent_task_id ? findTask(task.parent_task_id)?.root_id : null);
                if (rootId) {
                    await refreshProjectDetails(rootId);
                    return;
                }
            }
            await fetchProjects(page);
        },
        [findTask, refreshProjectDetails, fetchProjects, page]
    );

    return {
        tasks,
        setTasks,
        joinedProjects,
        hydratedProjects,
        setHydratedProjects,
        loading,
        error,
        joinedError,
        currentUserId,
        fetchTasks,
        fetchProjects,
        fetchProjectDetails,
        refreshProjectDetails,
        findTask,
        hasMore,
        isFetchingMore,
        loadMoreProjects,
        page,
        commitOptimisticUpdate,
    };
};
