import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { fetchFilteredTasks } from '../../services/taskService';

const SearchContext = createContext(null);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export function SearchProvider({ children, limit = 100 }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [projectId, setProjectId] = useState(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  const controllerRef = useRef(null);
  const debounceRef = useRef(null);

  const clearTimer = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const abortActiveRequest = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  };

  useEffect(() => () => {
    clearTimer();
    abortActiveRequest();
  }, []);

  useEffect(() => {
    const term = searchTerm.trim();

    if (!term) {
      clearTimer();
      abortActiveRequest();
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    abortActiveRequest();
    const controller = new AbortController();
    controllerRef.current = controller;

    clearTimer();
    setIsSearching(true);
    setError(null);

    const timerId = setTimeout(async () => {
      try {
        const { data } = await fetchFilteredTasks({
          q: term,
          projectId,
          includeArchived,
          from: 0,
          limit,
          signal: controller.signal,
        });

        setResults(data ?? []);
        setError(null);
      } catch (err) {
        if (err?.name === 'AbortError') {
          return;
        }
        setResults([]);
        setError(err);
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, DEBOUNCE_DELAY_MS);

    debounceRef.current = timerId;

    return () => {
      clearTimeout(timerId);
      controller.abort();
    };
  }, [searchTerm, projectId, includeArchived, limit]);

  const value = useMemo(
    () => ({
      searchTerm,
      setSearchTerm,
      projectId,
      setProjectId,
      includeArchived,
      setIncludeArchived,
      results,
      isSearching,
      error,
      hasQuery: Boolean(searchTerm.trim()),
      clearSearch: () => setSearchTerm(''),
    }),
    [searchTerm, projectId, includeArchived, results, isSearching, error]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}
