import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchFilteredTasks } from '../../services/taskService';
import rootLogger from '../../utils/logger';

export const SearchContext = createContext(null);

const log = rootLogger.withNamespace('SearchContext');
const DEBOUNCE_MS = 300;
const DEFAULT_FILTERS = Object.freeze({
  text: '',
  status: [],
  type: [],
  assigneeId: null,
  projectId: null,
  includeArchived: false,
  limit: 100,
});

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const [searchFilters, setSearchFilters] = useState({ ...DEFAULT_FILTERS });
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const serviceFilters = useMemo(() => {
    const {
      text,
      status,
      type,
      assigneeId,
      projectId,
      includeArchived,
      limit,
    } = searchFilters;

    return {
      text: text || '',
      status: Array.isArray(status) ? status : [],
      type: Array.isArray(type) ? type : [],
      assigneeId: assigneeId || null,
      projectId: projectId || null,
      includeArchived: Boolean(includeArchived),
      limit: typeof limit === 'number' ? limit : DEFAULT_FILTERS.limit,
    };
  }, [searchFilters]);

  const isSearchActive = useMemo(() => {
    return Boolean(
      serviceFilters.text.trim() ||
        serviceFilters.status.length ||
        serviceFilters.type.length ||
        serviceFilters.assigneeId ||
        serviceFilters.projectId ||
        serviceFilters.includeArchived
    );
  }, [serviceFilters]);

  useEffect(() => {
    let cancelled = false;

    if (!isSearchActive) {
      setFilteredTasks([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const debounceId = setTimeout(async () => {
      try {
        const { data, error } = await fetchFilteredTasks(serviceFilters);
        if (cancelled) {
          return;
        }

        if (error) {
          log.error('fetchFilteredTasks failed', error);
          setFilteredTasks([]);
        } else {
          setFilteredTasks(data);
        }
      } catch (err) {
        if (!cancelled) {
          log.error('Unexpected search failure', err);
          setFilteredTasks([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(debounceId);
    };
  }, [serviceFilters, isSearchActive]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (serviceFilters.text.trim()) count += 1;
    if (serviceFilters.status.length) count += 1;
    if (serviceFilters.type.length) count += 1;
    if (serviceFilters.assigneeId) count += 1;
    if (serviceFilters.projectId) count += 1;
    if (serviceFilters.includeArchived) count += 1;
    return count;
  }, [serviceFilters]);

  const activeFilters = useMemo(() => {
    const filters = [];

    if (serviceFilters.text.trim()) {
      filters.push({
        type: 'text',
        label: `Text: "${serviceFilters.text.trim()}"`,
        value: serviceFilters.text,
      });
    }

    if (serviceFilters.status.length) {
      filters.push({
        type: 'status',
        label: `Status: ${serviceFilters.status.join(', ')}`,
        value: [...serviceFilters.status],
      });
    }

    if (serviceFilters.type.length) {
      filters.push({
        type: 'type',
        label: `Type: ${serviceFilters.type.join(', ')}`,
        value: [...serviceFilters.type],
      });
    }

    if (serviceFilters.assigneeId) {
      filters.push({
        type: 'assigneeId',
        label: `Assignee: ${serviceFilters.assigneeId}`,
        value: serviceFilters.assigneeId,
      });
    }

    if (serviceFilters.projectId) {
      filters.push({
        type: 'projectId',
        label: `Project: ${serviceFilters.projectId}`,
        value: serviceFilters.projectId,
      });
    }

    if (serviceFilters.includeArchived) {
      filters.push({
        type: 'includeArchived',
        label: 'Including archived',
        value: true,
      });
    }

    return filters;
  }, [serviceFilters]);

  const updateFilter = (key, value) => {
    setSearchFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateTextSearch = (text) => {
    updateFilter('text', text);
  };

  const removeFilter = (filterType) => {
    const resetMap = {
      text: '',
      status: [],
      type: [],
      assigneeId: null,
      projectId: null,
      includeArchived: false,
    };

    if (filterType in resetMap) {
      updateFilter(filterType, resetMap[filterType]);
    }
  };

  const clearAllFilters = () => {
    setSearchFilters({ ...DEFAULT_FILTERS });
  };

  const contextValue = useMemo(
    () => ({
      searchFilters,
      setSearchFilters,
      filteredTasks,
      isSearching,
      isSearchActive,
      activeFilterCount,
      activeFilters,
      updateFilter,
      updateTextSearch,
      removeFilter,
      clearAllFilters,
    }),
    [
      searchFilters,
      filteredTasks,
      isSearching,
      isSearchActive,
      activeFilterCount,
      activeFilters,
    ]
  );

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  );
};
