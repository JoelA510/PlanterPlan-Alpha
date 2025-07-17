// src/hooks/useMasterLibrary.js
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../components/contexts/AuthContext';
import { useOrganization } from '../components/contexts/OrganizationProvider';
import { 
  addToMasterLibrary, 
  removeFromMasterLibrary, 
  checkIfInMasterLibrary,
  getMasterLibraryTasks 
} from '../services/taskService';

/**
 * Unified hook for master library state management and operations
 * Handles fetching, caching, and all operations with optimistic updates
 */
export const useMasterLibrary = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  
  // Core state
  const [libraryTasks, setLibraryTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  
  // Operation states
  const [operationLoading, setOperationLoading] = useState({});
  const [operationErrors, setOperationErrors] = useState({});
  
  // Cache for library status of individual tasks
  const [libraryStatusCache, setLibraryStatusCache] = useState(new Map());
  
  // Refs for cleanup
  const isMountedRef = useRef(true);
  const fetchTimeoutRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // 📁 STATE MANAGEMENT FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch all master library tasks
   * @param {boolean} forceRefresh - Force refresh even if recently fetched
   * @returns {Promise<{data: Array, error: string}>}
   */
  const fetchLibraryTasks = useCallback(async (forceRefresh = false) => {
    // Don't fetch if we just fetched recently (unless forced)
    if (!forceRefresh && lastFetched && Date.now() - lastFetched < 30000) {
      console.log('🚀 Using cached master library data');
      return { data: libraryTasks, error: null };
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching master library tasks...');

      const result = await getMasterLibraryTasks(organizationId, {
        includeTaskDetails: true
      });

      if (!isMountedRef.current) return { data: [], error: null };

      if (result.error) {
        console.error('❌ Failed to fetch library tasks:', result.error);
        setError(result.error);
        return { data: null, error: result.error };
      }

      const tasks = result.data || [];
      console.log('✅ Fetched', tasks.length, 'master library tasks');
      
      setLibraryTasks(tasks);
      setLastFetched(Date.now());
      
      // Update cache with fetched status
      const newCache = new Map(libraryStatusCache);
      tasks.forEach(item => {
        if (item.task?.id) {
          newCache.set(item.task.id, true);
        }
      });
      setLibraryStatusCache(newCache);

      return { data: tasks, error: null };
    } catch (err) {
      console.error('❌ Error fetching master library tasks:', err);
      const errorMessage = err.message || 'Failed to fetch master library tasks';
      
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      
      return { data: null, error: errorMessage };
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [organizationId, lastFetched, libraryTasks, libraryStatusCache]);

  /**
   * Check if a task is in the master library (with caching)
   * @param {string} taskId - Task ID to check
   * @returns {boolean|null} - True if in library, false if not, null if unknown
   */
  const isTaskInLibrary = useCallback((taskId) => {
    if (!taskId) return null;
    
    // Check cache first
    if (libraryStatusCache.has(taskId)) {
      return libraryStatusCache.get(taskId);
    }
    
    // Check in current library tasks
    const isInLibrary = libraryTasks.some(item => item.task?.id === taskId);
    
    // Update cache
    setLibraryStatusCache(prev => new Map(prev).set(taskId, isInLibrary));
    
    return isInLibrary;
  }, [libraryTasks, libraryStatusCache]);

  /**
   * Update library status cache for a task (for optimistic updates)
   * @param {string} taskId - Task ID
   * @param {boolean} isInLibrary - Whether task is in library
   */
  const updateLibraryStatusCache = useCallback((taskId, isInLibrary) => {
    setLibraryStatusCache(prev => new Map(prev).set(taskId, isInLibrary));
  }, []);

  /**
   * Optimistically add task to library state
   * @param {string} taskId - Task ID
   * @param {Object} taskData - Task data to add
   */
  const addTaskToLibraryState = useCallback((taskId, taskData) => {
    const libraryEntry = {
      id: `temp-${taskId}-${Date.now()}`,
      task_id: taskId,
      task: taskData,
      added_at: new Date().toISOString(),
      added_by: user?.id,
      white_label_id: organizationId
    };

    setLibraryTasks(prev => [libraryEntry, ...prev]);
    updateLibraryStatusCache(taskId, true);
  }, [organizationId, user?.id, updateLibraryStatusCache]);

  /**
   * Optimistically remove task from library state
   * @param {string} taskId - Task ID to remove
   */
  const removeTaskFromLibraryState = useCallback((taskId) => {
    setLibraryTasks(prev => prev.filter(item => item.task?.id !== taskId));
    updateLibraryStatusCache(taskId, false);
  }, [updateLibraryStatusCache]);

  // ═══════════════════════════════════════════════════════════════
  // 🔧 OPERATION HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  // Helper to set loading state for specific task
  const setTaskLoading = useCallback((taskId, isLoading) => {
    setOperationLoading(prev => ({
      ...prev,
      [taskId]: isLoading
    }));
  }, []);

  // Helper to set error state for specific task
  const setTaskError = useCallback((taskId, error) => {
    setOperationErrors(prev => ({
      ...prev,
      [taskId]: error
    }));
  }, []);

  // Clear error for specific task
  const clearTaskError = useCallback((taskId) => {
    setOperationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[taskId];
      return newErrors;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // 🚀 MAIN OPERATION FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Add a task to master library with optimistic updates
   * @param {string} taskId - Task ID to add
   * @param {Object} taskData - Task data for optimistic update
   * @param {Object} callbacks - Optional callbacks
   * @returns {Promise<{success: boolean, error: string}>}
   */
  const addTaskToLibrary = useCallback(async (taskId, taskData, callbacks = {}) => {
    if (!user?.id) {
      const error = 'User not authenticated';
      callbacks.onError?.(taskId, error);
      return { success: false, error };
    }

    try {
      setTaskLoading(taskId, true);
      clearTaskError(taskId);

      // Optimistic update - immediately show as added
      if (taskData) {
        addTaskToLibraryState(taskId, taskData);
      }
      callbacks.onOptimisticUpdate?.(taskId, true);

      console.log('🔄 Adding task to master library:', taskId);

      // Perform actual database operation
      const result = await addToMasterLibrary(taskId, user.id, organizationId);

      if (result.success) {
        console.log('✅ Task added to master library successfully');
        callbacks.onSuccess?.(taskId, result.data);
        
        // Refresh library data to get accurate info
        fetchTimeoutRef.current = setTimeout(() => {
          fetchLibraryTasks(true);
        }, 1000);
        
        return { success: true, error: null };
      } else {
        console.warn('⚠️ Failed to add task to master library:', result.error);
        
        // Rollback optimistic update
        if (taskData) {
          removeTaskFromLibraryState(taskId);
        }
        callbacks.onError?.(taskId, result.error);
        setTaskError(taskId, result.error);
        
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('❌ Error adding task to master library:', err);
      const error = err.message || 'Unknown error occurred';
      
      // Rollback optimistic update
      if (taskData) {
        removeTaskFromLibraryState(taskId);
      }
      callbacks.onError?.(taskId, error);
      setTaskError(taskId, error);
      
      return { success: false, error };
    } finally {
      setTaskLoading(taskId, false);
    }
  }, [user?.id, organizationId, setTaskLoading, clearTaskError, setTaskError, addTaskToLibraryState, removeTaskFromLibraryState, fetchLibraryTasks]);

  /**
   * Remove a task from master library with optimistic updates
   * @param {string} taskId - Task ID to remove
   * @param {Object} callbacks - Optional callbacks
   * @returns {Promise<{success: boolean, error: string}>}
   */
  const removeTaskFromLibrary = useCallback(async (taskId, callbacks = {}) => {
    if (!user?.id) {
      const error = 'User not authenticated';
      callbacks.onError?.(taskId, error);
      return { success: false, error };
    }

    try {
      setTaskLoading(taskId, true);
      clearTaskError(taskId);

      // Optimistic update - immediately show as removed
      removeTaskFromLibraryState(taskId);
      callbacks.onOptimisticUpdate?.(taskId, false);

      console.log('🔄 Removing task from master library:', taskId);

      // Perform actual database operation
      const result = await removeFromMasterLibrary(taskId, user.id, organizationId);

      if (result.success) {
        console.log('✅ Task removed from master library successfully');
        callbacks.onSuccess?.(taskId, result.data);
        
        // Refresh library data to ensure consistency
        fetchTimeoutRef.current = setTimeout(() => {
          fetchLibraryTasks(true);
        }, 1000);
        
        return { success: true, error: null };
      } else {
        console.warn('⚠️ Failed to remove task from master library:', result.error);
        
        // Rollback optimistic update - refresh to restore correct state
        fetchTimeoutRef.current = setTimeout(() => {
          fetchLibraryTasks(true);
        }, 500);
        
        callbacks.onError?.(taskId, result.error);
        setTaskError(taskId, result.error);
        
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('❌ Error removing task from master library:', err);
      const error = err.message || 'Unknown error occurred';
      
      // Rollback optimistic update
      fetchTimeoutRef.current = setTimeout(() => {
        fetchLibraryTasks(true);
      }, 500);
      
      callbacks.onError?.(taskId, error);
      setTaskError(taskId, error);
      
      return { success: false, error };
    } finally {
      setTaskLoading(taskId, false);
    }
  }, [user?.id, organizationId, setTaskLoading, clearTaskError, setTaskError, removeTaskFromLibraryState, fetchLibraryTasks]);

  /**
   * Toggle task membership in master library
   * @param {string} taskId - Task ID to toggle
   * @param {Object} taskData - Task data for optimistic updates
   * @param {Object} callbacks - Optional callbacks
   * @returns {Promise<{success: boolean, error: string}>}
   */
  const toggleLibraryMembership = useCallback(async (taskId, taskData, callbacks = {}) => {
    const currentStatus = isTaskInLibrary(taskId);
    
    if (currentStatus) {
      return await removeTaskFromLibrary(taskId, callbacks);
    } else {
      return await addTaskToLibrary(taskId, taskData, callbacks);
    }
  }, [isTaskInLibrary, addTaskToLibrary, removeTaskFromLibrary]);

  /**
   * Check if a single task is in the master library (API call)
   * @param {string} taskId - Task ID to check
   * @returns {Promise<{isInLibrary: boolean, error: string}>}
   */
  const checkTaskLibraryStatus = useCallback(async (taskId) => {
    try {
      setTaskLoading(taskId, true);
      clearTaskError(taskId);

      const result = await checkIfInMasterLibrary(taskId, organizationId);
      
      if (result.error) {
        setTaskError(taskId, result.error);
      } else {
        // Update cache with fresh data
        updateLibraryStatusCache(taskId, result.isInLibrary);
      }
      
      return result;
    } catch (err) {
      const error = err.message || 'Unknown error occurred';
      setTaskError(taskId, error);
      return { isInLibrary: false, error };
    } finally {
      setTaskLoading(taskId, false);
    }
  }, [organizationId, setTaskLoading, clearTaskError, setTaskError, updateLibraryStatusCache]);

  // ═══════════════════════════════════════════════════════════════
  // 🔍 UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Batch check library status using cached data (instant)
   * @param {string[]} taskIds - Array of task IDs to check
   * @returns {Object} - Object with taskId as key, boolean as value
   */
  const batchCheckLibraryStatus = useCallback((taskIds) => {
    const result = {};
    taskIds.forEach(taskId => {
      result[taskId] = isTaskInLibrary(taskId) || false;
    });
    return result;
  }, [isTaskInLibrary]);

  /**
   * Search master library tasks
   * @param {string} searchTerm - Search term
   * @returns {Array} - Filtered library tasks
   */
  const searchLibraryTasks = useCallback((searchTerm) => {
    if (!searchTerm?.trim()) return libraryTasks;

    const term = searchTerm.toLowerCase().trim();
    return libraryTasks.filter(item => {
      const task = item.task;
      if (!task) return false;

      return (
        task.title?.toLowerCase().includes(term) ||
        task.description?.toLowerCase().includes(term) ||
        task.purpose?.toLowerCase().includes(term) ||
        task.actions?.some(action => action?.toLowerCase().includes(term)) ||
        task.resources?.some(resource => resource?.toLowerCase().includes(term))
      );
    });
  }, [libraryTasks]);

  /**
   * Get loading state for a specific task
   * @param {string} taskId - Task ID
   * @returns {boolean} - Whether the task operation is loading
   */
  const isTaskLoading = useCallback((taskId) => {
    return operationLoading[taskId] || false;
  }, [operationLoading]);

  /**
   * Get error state for a specific task
   * @param {string} taskId - Task ID
   * @returns {string|null} - Error message or null
   */
  const getTaskError = useCallback((taskId) => {
    return operationErrors[taskId] || null;
  }, [operationErrors]);

  /**
   * Clear all operation errors
   */
  const clearAllErrors = useCallback(() => {
    setOperationErrors({});
  }, []);

  /**
   * Refresh library data
   */
  const refreshLibrary = useCallback(() => {
    return fetchLibraryTasks(true);
  }, [fetchLibraryTasks]);

  /**
   * Clear cache and reload
   */
  const clearCacheAndReload = useCallback(() => {
    setLibraryStatusCache(new Map());
    setLastFetched(null);
    return fetchLibraryTasks(true);
  }, [fetchLibraryTasks]);

  // ═══════════════════════════════════════════════════════════════
  // 📊 COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get library statistics
   */
  const libraryStats = useMemo(() => {
    const total = libraryTasks.length;
    const templates = libraryTasks.filter(item => item.task?.origin === 'template').length;
    const recentlyAdded = libraryTasks.filter(item => {
      if (!item.added_at) return false;
      const addedDate = new Date(item.added_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return addedDate > weekAgo;
    }).length;

    return {
      total,
      templates,
      recentlyAdded,
      cacheSize: libraryStatusCache.size
    };
  }, [libraryTasks, libraryStatusCache]);

  /**
   * Check if any operations are currently loading
   * @returns {boolean} - Whether any operations are in progress
   */
  const isAnyOperationLoading = useMemo(() => {
    return Object.values(operationLoading).some(loading => loading);
  }, [operationLoading]);

  // ═══════════════════════════════════════════════════════════════
  // 🎬 INITIAL SETUP
  // ═══════════════════════════════════════════════════════════════

  // Initial fetch
  useEffect(() => {
    if (organizationId !== undefined) { // Allow null
      fetchLibraryTasks();
    }
  }, [organizationId]); // Only depend on organizationId

  // ═══════════════════════════════════════════════════════════════
  // 📤 RETURN API
  // ═══════════════════════════════════════════════════════════════

  return {
    // Core state
    libraryTasks,
    loading,
    error,
    lastFetched,

    // Cache state
    libraryStatusCache,
    
    // Main operations
    fetchLibraryTasks,
    refreshLibrary,
    clearCacheAndReload,

    // Task operations
    addTaskToLibrary,
    removeTaskFromLibrary,
    toggleLibraryMembership,

    // Task status checking
    isTaskInLibrary,
    checkTaskLibraryStatus,
    batchCheckLibraryStatus,
    updateLibraryStatusCache,

    // State management
    addTaskToLibraryState,
    removeTaskFromLibraryState,

    // Utilities
    searchLibraryTasks,

    // Operation state queries
    isTaskLoading,
    getTaskError,
    isAnyOperationLoading,

    // Error management
    clearTaskError,
    clearAllErrors,

    // Statistics
    libraryStats,

    // Raw state (for debugging)
    operationLoading,
    operationErrors,
  };
};

export default useMasterLibrary;