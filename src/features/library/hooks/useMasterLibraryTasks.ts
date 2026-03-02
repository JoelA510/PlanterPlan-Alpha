import { useInfiniteQuery } from '@tanstack/react-query';
import { planter } from '@/shared/api/planterClient';

const DEFAULT_LIMIT = 25;

interface UseMasterLibraryTasksProps {
    limit?: number;
    resourceType?: string | null;
    enabled?: boolean;
}

export const useMasterLibraryTasks = ({
    limit = DEFAULT_LIMIT,
    resourceType = 'all',
    enabled = true,
}: UseMasterLibraryTasksProps = {}) => {
    const queryResult = useInfiniteQuery({
        queryKey: ['masterLibraryTasks', limit, resourceType],
        queryFn: async ({ pageParam = 0 }) => {
            const from = pageParam * limit;
            const { data, error } = await planter.entities.TaskWithResources.listTemplates({
                from,
                limit,
                resourceType,
            });
            if (error) throw error;
            return {
                data: data || [],
                nextPage: (data || []).length === limit ? pageParam + 1 : undefined,
            };
        },
        getNextPageParam: (lastPage) => lastPage.nextPage,
        initialPageParam: 0,
        enabled,
    });

    const tasks = queryResult.data?.pages.flatMap((page) => page.data) || [];

    return {
        tasks,
        isLoading: queryResult.isLoading,
        isFetchingNextPage: queryResult.isFetchingNextPage,
        hasNextPage: queryResult.hasNextPage,
        fetchNextPage: queryResult.fetchNextPage,
        error: queryResult.error,
        refresh: queryResult.refetch,
    };
};

export default useMasterLibraryTasks;
