import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMasterLibraryTasks } from '@features/tasks/services/taskService';

const DEFAULT_LIMIT = 25;

const initialState = {
  tasks: [],
  isLoading: false,
  error: null,
  hasMore: false,
};

const useMasterLibraryTasks = ({
  page = 0,
  limit = DEFAULT_LIMIT,
  resourceType = 'all',
  enabled = true,
} = {}) => {
  const [state, setState] = useState(initialState);
  const latestRequestRef = useRef(0);
  const controllerRef = useRef(null);

  const loadTasks = useCallback(
    async ({ controller } = {}) => {
      const abortController = controller ?? new AbortController();

      if (controllerRef.current && controllerRef.current !== abortController) {
        controllerRef.current.abort();
      }

      controllerRef.current = abortController;

      const requestId = Date.now();
      latestRequestRef.current = requestId;

      setState((previous) => ({
        ...previous,
        isLoading: true,
        error: null,
      }));

      const from = Math.max(0, page * limit);

      try {
        const { data: tasks, error: fetchError } = await fetchMasterLibraryTasks({
          from,
          limit,
          resourceType,
          signal: abortController.signal,
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

        if (controllerRef.current === abortController) {
          controllerRef.current = null;
        }
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }

        if (latestRequestRef.current !== requestId) {
          return;
        }

        setState((previous) => ({
          ...previous,
          isLoading: false,
          error,
        }));

        if (controllerRef.current === abortController) {
          controllerRef.current = null;
        }
      }
    },
    [limit, page, resourceType]
  );

  const refresh = useCallback(() => {
    const controller = new AbortController();
    loadTasks({ controller });
    return () => controller.abort();
  }, [loadTasks]);

  useEffect(() => {
    if (!enabled) {
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
      setState(initialState);
      return;
    }

    const controller = new AbortController();
    loadTasks({ controller });

    return () => {
      if (controllerRef.current === controller) {
        controllerRef.current.abort();
        controllerRef.current = null;
      } else {
        controller.abort();
      }
    };
  }, [enabled, loadTasks]);

  return {
    ...state,
    refresh,
  };
};

export default useMasterLibraryTasks;
