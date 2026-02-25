import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/db/client';
import { useAuth } from '@/app/contexts/AuthContext';
import { planter } from '@/shared/api/planterClient';

const PAGE_SIZE = 20;

export const useTaskQuery = () => {
    const { user: authUser } = useAuth();
    const currentUserId = authUser?.id || null;
    const queryClient = useQueryClient();

    // 1. Fetch Paginated User Projects (Instances)
    const {
        data: projectsData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isLoadingProjects,
        error: projectsError,
        refetch: refetchProjects,
    } = useInfiniteQuery({
        queryKey: ['projects', 'instance', currentUserId],
        queryFn: async ({ pageParam = 1 }) => {
            if (!currentUserId) return [];
            return await planter.entities.Project.listByCreator(currentUserId, pageParam, PAGE_SIZE);
        },
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined;
        },
        enabled: !!currentUserId,
    });

    // 2. Fetch Templates (Non-paginated for now per original logic)
    const {
        data: templates,
        isLoading: isLoadingTemplates,
    } = useQuery({
        queryKey: ['projects', 'template', currentUserId],
        queryFn: async () => {
            if (!currentUserId) return [];
            const { data, error } = await supabase
                .from('tasks_with_primary_resource')
                .select('*')
                .eq('creator', currentUserId)
                .eq('origin', 'template')
                .is('parent_task_id', null)
                .order('title', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!currentUserId,
    });

    // 3. Fetch Joined Projects
    const {
        data: joinedProjects,
        error: joinedError,
        isLoading: isLoadingJoined,
    } = useQuery({
        queryKey: ['projects', 'joined', currentUserId],
        queryFn: async () => {
            if (!currentUserId) return [];
            return await planter.entities.Project.listJoined(currentUserId);
        },
        enabled: !!currentUserId,
    });

    // Combine instances and templates into tasks
    const tasks = [
        ...(projectsData?.pages.flat() || []),
        ...(templates || [])
    ];

    const findTask = (id: string) => {
        if (!id) return null;
        const inRoots = tasks.find((t: Record<string, unknown>) => t.id === id) || joinedProjects?.find((t: Record<string, unknown>) => t.id === id);
        if (inRoots) return inRoots;

        for (const projTasks of Object.values(hydratedProjects as Record<string, Record<string, unknown>[]>)) {
            const found = projTasks.find((t: Record<string, unknown>) => t.id === id);
            if (found) return found;
        }
        return null;
    };

    const refreshProjectDetails = async () => {
        // In a real strict RQ setup, we'd invalidate the specific query key.
        // For now, to satisfy the old API:
        await refetchProjects();
    };

    const fetchTasks = async () => {
        await refetchProjects();
    };

    const fetchProjects = async () => {
        await refetchProjects();
    };

    // React Query handles state, so setTasks is a no-op just to satisfy the old signature
    // before we delete useTaskOperations entirely.
    const setTasks = () => { };

    const commitOptimisticUpdate = async () => {
        await refetchProjects();
    };

    const loading = isLoadingProjects || isLoadingTemplates || (!joinedProjects && isLoadingJoined);
    const error = projectsError ? (projectsError as Error).message : null;

    // Helper exposed for manual hydration elsewhere if needed, though React Query
    // manages cache now, we preserve the map in `useTaskOperations` or components.
    // For now, return a dummy object as actual hydration is handled separately.
    const hydratedProjects = {};

    return {
        tasks,
        joinedProjects: joinedProjects || [],
        hydratedProjects,
        loading,
        error,
        joinedError: joinedError ? (joinedError as Error).message : null,
        currentUserId,
        hasMore: !!hasNextPage,
        isFetchingMore: isFetchingNextPage,
        loadMoreProjects: fetchNextPage,
        refetchProjects,
        findTask,
    };
};
