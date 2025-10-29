import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { fetchFilteredTasks } from '../../services/taskService';
import { rootLogger } from '../../utils/logger';

const log = rootLogger.withNamespace('SearchContext');

const DEFAULT_FILTERS = {
  text: '',
  status: null,
  taskType: null,
  assigneeId: null,
  projectId: null,
  limit: 50,
  from: 0,
};

const createDefaultFilters = () => ({ ...DEFAULT_FILTERS });

export const SearchContext = createContext(null);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export function SearchProvider({ children }) {
  const [filters, setFilters] = useState(() => createDefaultFilters());
  const [results, setResults] = useState([]);
  const [count, setCount] = useState(0);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const timerRef = useRef(null);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const updateTextSearch = useCallback((text) => {
    setFilters((prev) => ({
      ...prev,
      text,
      from: 0,
    }));
  }, []);

  const reset = useCallback(() => {
    setFilters(createDefaultFilters());
  }, []);

  const runSearch = useCallback(
    async (activeFilters) => {
      setLoading(true);
      setError(null);
      try {
        const { data, count: total } = await fetchFilteredTasks(activeFilters);
        setResults(data);
        setCount(total);
      } catch (err) {
        log.error('fetchFilteredTasks failed', err);
        setResults([]);
        setCount(0);
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      runSearch(filters);
    }, 300);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [filters, runSearch]);

  const activeFilterCount = useMemo(() => {
    let total = 0;

    if (filters.text && filters.text.trim()) total += 1;

    const countValue = (value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return Boolean(value);
    };

    if (countValue(filters.status)) total += 1;
    if (countValue(filters.taskType)) total += 1;
    if (filters.assigneeId) total += 1;
    if (filters.projectId) total += 1;

    return total;
  }, [filters]);

  const isSearchActive = useMemo(() => activeFilterCount > 0, [activeFilterCount]);

  const value = useMemo(
    () => ({
      filters,
      searchFilters: filters,
      setFilters,
      setSearchFilters: setFilters,
      results,
      filteredTasks: results,
      count,
      isLoading,
      isSearching: isLoading,
      error,
      isSearchActive,
      activeFilterCount,
      reset,
      clearAllFilters: reset,
      updateFilter,
      updateTextSearch,
    }),
    [
      filters,
      results,
      count,
      isLoading,
      error,
      isSearchActive,
      activeFilterCount,
      reset,
      updateFilter,
      updateTextSearch,
    ]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}
