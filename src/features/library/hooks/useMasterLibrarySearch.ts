import { useQuery } from '@tanstack/react-query';
import useDebounce from '@/shared/lib/hooks/useDebounce';
import { planter } from '@/shared/api/planterClient';

const DEFAULT_SEARCH_LIMIT = 15;

interface UseMasterLibrarySearchProps {
    query?: string;
    limit?: number;
    resourceType?: string | null;
    enabled?: boolean;
    debounceMs?: number;
}

export const useMasterLibrarySearch = ({
    query = '',
    limit = DEFAULT_SEARCH_LIMIT,
    resourceType = null,
    enabled = true,
    debounceMs = 300,
}: UseMasterLibrarySearchProps = {}) => {
    const debouncedQuery = useDebounce(query, debounceMs);
    const trimmedQuery = typeof debouncedQuery === 'string' ? debouncedQuery.trim() : '';

    const queryResult = useQuery({
        queryKey: ['masterLibrarySearch', trimmedQuery, limit, resourceType],
        queryFn: async () => {
            if (!trimmedQuery) {
                return [];
            }
            const { data, error } = await planter.entities.TaskWithResources.searchTemplates({
                query: trimmedQuery,
                limit,
                resourceType,
            });
            if (error) throw error;
            return data || [];
        },
        enabled: enabled && !!trimmedQuery,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    const results = !trimmedQuery ? [] : (queryResult.data || []);

    return {
        results,
        isLoading: queryResult.isLoading && !!trimmedQuery,
        isFetching: queryResult.isFetching,
        error: queryResult.error,
        hasResults: results.length > 0,
        refetch: queryResult.refetch,
    };
};

export default useMasterLibrarySearch;
