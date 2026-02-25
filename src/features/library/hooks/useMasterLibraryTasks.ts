import { useCallback, useEffect, useRef, useState } from 'react';
import { planter } from '@/shared/api/planterClient';

const DEFAULT_LIMIT = 25;

const initialState = {
    tasks: [],
    isLoading: false,
    error: null,
    hasMore: false,
};

interface UseMasterLibraryTasksProps {
    page?: number;
    limit?: number;
    resourceType?: string | null;
    enabled?: boolean;
}

export const useMasterLibraryTasks = ({
    page = 0,
    limit = DEFAULT_LIMIT,
    resourceType = 'all',
    enabled = true,
}: UseMasterLibraryTasksProps = {}) => {
    const [state, setState] = useState<{ tasks: any[]; isLoading: boolean; error: any | null; hasMore: boolean }>(initialState);
    const latestRequestRef = useRef<number>(0);

    const loadTasks = useCallback(
        async () => {
            const requestId = Date.now();
            latestRequestRef.current = requestId;

            setState((previous) => ({
                ...previous,
                isLoading: true,
                error: null,
            }));

            const from = Math.max(0, page * limit);

            try {
                const { data: tasks, error: fetchError } = await planter.entities.TaskWithResources.listTemplates({
                    from,
                    limit,
                    resourceType,
                });

                if (latestRequestRef.current !== requestId) {
                    return;
                }

                if (fetchError) throw fetchError;

                setState({
                    tasks: tasks || [],
                    isLoading: false,
                    error: null,
                    hasMore: (tasks || []).length === limit,
                });

            } catch (error: any) {
                if (latestRequestRef.current !== requestId) {
                    return;
                }

                setState((previous) => ({
                    ...previous,
                    isLoading: false,
                    error,
                }));
            }
        },
        [limit, page, resourceType]
    );

    const refresh = useCallback(() => {
        loadTasks();
    }, [loadTasks]);

    useEffect(() => {
        if (!enabled) {
            setState(initialState);
            return;
        }

        loadTasks();
    }, [enabled, loadTasks]);

    return {
        ...state,
        refresh,
    };
};

export default useMasterLibraryTasks;
