import { useCallback, useEffect, useRef, useState } from 'react';
import useDebounce from './useDebounce';
import { searchMasterLibraryTasks } from '../services/taskService';

const DEFAULT_SEARCH_LIMIT = 15;
const initialState = {
  results: [],
  isLoading: false,
  error: null,
};

const useMasterLibrarySearch = ({
  query,
  limit = DEFAULT_SEARCH_LIMIT,
  resourceType = null,
  enabled = true,
  debounceMs = 300,
} = {}) => {
  const [state, setState] = useState(initialState);
  const debouncedQuery = useDebounce(query, debounceMs);
  const controllerRef = useRef(null);
  const latestRequestRef = useRef(0);

  const executeSearch = useCallback(
    async (searchTerm, controller) => {
      if (controllerRef.current && controllerRef.current !== controller) {
        controllerRef.current.abort();
      }
      controllerRef.current = controller;
      const requestId = Date.now();
      latestRequestRef.current = requestId;

      setState((previous) => ({
        ...previous,
        isLoading: true,
        error: null,
      }));

      try {
        const { data: results, error: searchError } = await searchMasterLibraryTasks({
          query: searchTerm,
          limit,
          resourceType,
          signal: controller.signal,
        });

        if (latestRequestRef.current !== requestId) {
          return;
        }

        if (searchError) {
          throw searchError; // Re-throw to hit catch block (or handle here directly)
        }

        setState({
          results: results || [],
          isLoading: false,
          error: null,
        });

        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }

        if (latestRequestRef.current !== requestId) {
          return;
        }

        setState({
          results: [],
          isLoading: false,
          error,
        });

        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    },
    [limit, resourceType]
  );

  useEffect(() => {
    if (!enabled) {
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
      setState(initialState);
      return;
    }

    const trimmedQuery = typeof debouncedQuery === 'string' ? debouncedQuery.trim() : '';

    if (!trimmedQuery) {
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
      setState(initialState);
      return;
    }

    const controller = new AbortController();
    executeSearch(trimmedQuery, controller);

    return () => {
      if (controllerRef.current === controller) {
        controllerRef.current.abort();
        controllerRef.current = null;
      } else {
        controller.abort();
      }
    };
  }, [debouncedQuery, enabled, executeSearch]);

  return {
    ...state,
    hasResults: state.results.length > 0,
  };
};

export default useMasterLibrarySearch;
