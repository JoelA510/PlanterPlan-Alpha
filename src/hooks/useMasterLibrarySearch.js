// src/hooks/useMasterLibrarySearch.js
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../components/contexts/AuthContext';
import { useOrganization } from '../components/contexts/OrganizationProvider';
import { searchMasterLibraryTasks } from '../services/taskService';
import { useMasterLibrary } from './useMasterLibrary';

/**
 * Hook for searching master library tasks with debouncing and caching
 */
export const useMasterLibrarySearch = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const masterLibrary = useMasterLibrary();
  
  // Core search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const resultsPerPage = 20;
  
  // Caching for performance
  const [searchCache, setSearchCache] = useState(new Map());
  const [recentSearches, setRecentSearches] = useState([]);
  
  // Refs for cleanup and debouncing
  const isMountedRef = useRef(true);
  const debounceTimeoutRef = useRef(null);
  const lastSearchRef = useRef('');
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Create cache key for search results
   */
  const createCacheKey = useCallback((term, page = 0) => {
    return `${term.toLowerCase().trim()}-${organizationId || 'null'}-${page}`;
  }, [organizationId]);

  /**
   * Perform the actual search API call
   */
  const performSearchQuery = useCallback(async (term, page = 0, useCache = true) => {
    console.log("Int performe Search query");
    const trimmedTerm = term.trim();
    
    if (!trimmedTerm) {
      return { data: [], error: null, totalCount: 0 };
    }
    
    const cacheKey = createCacheKey(trimmedTerm, page);
    
    // Check cache first
    if (useCache && searchCache.has(cacheKey)) {
      console.log('🚀 Using cached search results for:', trimmedTerm);
      return searchCache.get(cacheKey);
    }
    
    console.log('🔄 Performing search query:', { term: trimmedTerm, page });
    
    try {
      const result = await searchMasterLibraryTasks(trimmedTerm, organizationId, {
        limit: resultsPerPage,
        offset: page * resultsPerPage,
        includeTaskDetails: true
      });
      
      // Cache the result
      if (result.data && !result.error) {
        setSearchCache(prev => new Map(prev).set(cacheKey, result));
      }
      
      return result;
    } catch (error) {
      console.error('Search query failed:', error);
      return { data: null, error: error.message, totalCount: 0 };
    }
  }, [organizationId, searchCache, createCacheKey, resultsPerPage]);

  /**
   * Debounced search function
   */
  const performSearch = useCallback(async (term, page = 0, appendResults = false) => {
    const trimmedTerm = term.trim();
    
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // If empty term, clear results immediately
    if (!trimmedTerm) {
      setSearchResults([]);
      setSearchError(null);
      setTotalResults(0);
      setHasSearched(false);
      setCurrentPage(0);
      setHasMoreResults(false);
      return;
    }
    
    // Set loading state immediately
    setIsSearching(true);
    setSearchError(null);
    
    // Debounce the actual search
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await performSearchQuery(trimmedTerm, page);
        console.log(result);
        // if (!isMountedRef.current) return;
        
        if (result.error) {
          setSearchError(result.error);
          setSearchResults([]);
          setTotalResults(0);
        } else {
          const newResults = result.data || [];
          
          if (appendResults && page > 0) {
            // Append to existing results (pagination)
            setSearchResults(prev => [...prev, ...newResults]);
          } else {
            // Replace results (new search)
            setSearchResults(newResults);
          }
          
          setTotalResults(result.totalCount || 0);
          setCurrentPage(page);
          setHasMoreResults((page + 1) * resultsPerPage < (result.totalCount || 0));
          
          // Add to recent searches if it's a new search
          if (page === 0 && trimmedTerm !== lastSearchRef.current) {
            setRecentSearches(prev => {
              const updated = [trimmedTerm, ...prev.filter(s => s !== trimmedTerm)];
              return updated.slice(0, 5); // Keep last 5 searches
            });
            lastSearchRef.current = trimmedTerm;
          }
        }
        
        setHasSearched(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchError(error.message || 'Search failed');
        setSearchResults([]);
        setTotalResults(0);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce
  }, [performSearchQuery]);

  /**
   * Load more results (pagination)
   */
  const loadMoreResults = useCallback(async () => {
    if (!hasMoreResults || isSearching || !searchTerm.trim()) return;
    
    await performSearch(searchTerm, currentPage + 1, true);
  }, [hasMoreResults, isSearching, searchTerm, currentPage, performSearch]);

  /**
   * Clear search and reset state
   */
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    setSearchError(null);
    setTotalResults(0);
    setHasSearched(false);
    setCurrentPage(0);
    setHasMoreResults(false);
    
    // Clear any pending debounced search
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, []);

  /**
   * Set search term and trigger search
   */
  const updateSearchTerm = useCallback((term) => {
    setSearchTerm(term);
    performSearch(term, 0, false);
  }, [performSearch]);

  /**
   * Add template to user's library from search results
   */
  const addToLibraryFromSearch = useCallback(async (task) => {
    if (!task || !user?.id) {
      return { success: false, error: 'Invalid task or user not authenticated' };
    }
    
    try {
      console.log('🔄 Adding template to library from search:', task.id);
      
      const result = await masterLibrary.addTaskToLibrary(task.id, task, {
        onOptimisticUpdate: (taskId, status) => {
          console.log('⚡ Optimistic update from search:', taskId, status);
        },
        onSuccess: (taskId, data) => {
          console.log('✅ Successfully added to library from search:', taskId);
        },
        onError: (taskId, error) => {
          console.error('❌ Failed to add to library from search:', error);
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error adding to library from search:', error);
      return { success: false, error: error.message };
    }
  }, [masterLibrary, user?.id]);

  /**
   * Check if a task from search results is already in user's library
   */
  const isTaskInLibrary = useCallback((taskId) => {
    return masterLibrary.isTaskInLibrary(taskId);
  }, [masterLibrary]);

  /**
   * Get loading state for specific task operations
   */
  const isTaskLoading = useCallback((taskId) => {
    return masterLibrary.isTaskLoading(taskId);
  }, [masterLibrary]);

  /**
   * Clear search cache
   */
  const clearCache = useCallback(() => {
    setSearchCache(new Map());
    console.log('🗑️ Search cache cleared');
  }, []);

  /**
   * Search suggestions based on recent searches
   */
  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return recentSearches;
    
    return recentSearches.filter(recent => 
      recent.toLowerCase().includes(searchTerm.toLowerCase().trim()) &&
      recent !== searchTerm.trim()
    );
  }, [searchTerm, recentSearches]);

  /**
   * Search statistics
   */
  const searchStats = useMemo(() => ({
    totalResults,
    currentResults: searchResults.length,
    currentPage: currentPage + 1,
    totalPages: Math.ceil(totalResults / resultsPerPage),
    hasMoreResults,
    cacheSize: searchCache.size
  }), [totalResults, searchResults.length, currentPage, hasMoreResults, searchCache.size]);

  // Auto-trigger search when searchTerm changes
  useEffect(() => {
    if (searchTerm !== lastSearchRef.current) {
      performSearch(searchTerm, 0, false);
    }
  }, [searchTerm, performSearch]);

  return {
    // Core search state
    searchTerm,
    searchResults,
    isSearching,
    searchError,
    hasSearched,
    
    // Pagination
    hasMoreResults,
    loadMoreResults,
    
    // Search actions
    updateSearchTerm,
    performSearch,
    clearSearch,
    
    // Library integration
    addToLibraryFromSearch,
    isTaskInLibrary,
    isTaskLoading,
    
    // Suggestions and cache
    searchSuggestions,
    recentSearches,
    clearCache,
    
    // Statistics
    searchStats,
    
    // Master library integration
    masterLibrary,
  };
};

export default useMasterLibrarySearch;