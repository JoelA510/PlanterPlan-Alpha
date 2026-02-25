import { useCallback, useEffect, useRef, useState } from 'react';
import useDebounce from '@/shared/lib/hooks/useDebounce';
import { planter } from '@/shared/api/planterClient';

const DEFAULT_SEARCH_LIMIT = 15;
const initialState = {
    results: [],
    isLoading: false,
    error: null,
};

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
    const [state, setState] = useState<{ results: any[]; isLoading: boolean; error: any | null }>(initialState);
    const debouncedQuery = useDebounce(query, debounceMs);
    const latestRequestRef = useRef<number>(0);
    const queryCache = useRef<Record<string, any[]>>({});

    const executeSearch = useCallback(
        async (searchTerm: string) => {
            // Check cache first
            if (queryCache.current[searchTerm]) {
                setState({
                    results: queryCache.current[searchTerm],
                    isLoading: false,
                    error: null,
                });
                return;
            }

            const requestId = Date.now();
            latestRequestRef.current = requestId;

            setState((previous) => ({
                ...previous,
                isLoading: true,
                error: null,
            }));

            try {
                const { data: results, error: searchError } = await planter.entities.TaskWithResources.searchTemplates({
                    query: searchTerm,
                    limit,
                    resourceType,
                });

                if (latestRequestRef.current !== requestId) {
                    return;
                }

                if (searchError) {
                    throw searchError;
                }

                // Cache the successful result
                queryCache.current[searchTerm] = results || [];

                setState({
                    results: results || [],
                    isLoading: false,
                    error: null,
                });
            } catch (error: any) {
                if (latestRequestRef.current !== requestId) {
                    return;
                }

                setState({
                    results: [],
                    isLoading: false,
                    error,
                });
            }
        },
        [limit, resourceType]
    );

    useEffect(() => {
        if (!enabled) {
            setState(initialState);
            return;
        }

        const trimmedQuery = typeof debouncedQuery === 'string' ? debouncedQuery.trim() : '';

        if (!trimmedQuery) {
            setState(initialState);
            return;
        }

        executeSearch(trimmedQuery);
    }, [debouncedQuery, enabled, executeSearch]);

    return {
        ...state,
        hasResults: state.results.length > 0,
    };
};

export default useMasterLibrarySearch;
