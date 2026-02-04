import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@app/supabaseClient';
import { useAuth } from '@app/contexts/AuthContext';
import { fetchTaskChildren } from '@features/tasks/services/taskService';
import { getJoinedProjects, getUserProjects } from '@features/projects/services/projectService';

const PAGE_SIZE = 20;

// Helper to merge new projects avoiding duplicates
const mergeProjects = (existing, newProjs) => {
  const existingIds = new Set(existing.map((t) => t.id));
  const uniqueNews = newProjs.filter((t) => !existingIds.has(t.id));
  return [...existing, ...uniqueNews];
};

export const useTaskQuery = () => {
  const [tasks, setTasks] = useState([]); // Stores Root Projects (Instance) + Templates
  const [hydratedProjects, setHydratedProjects] = useState({}); // Stores children of projects: { [projectId]: [task1, task2...] }
  const [joinedProjects, setJoinedProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joinedError, setJoinedError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const isMountedRef = useRef(false);

  const fetchProjects = useCallback(async (pageNum = 1) => {
    if (!isMountedRef.current) return;
    if (pageNum === 1) setLoading(true);
    else setIsFetchingMore(true);

    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isMountedRef.current) return;
      if (!user) {
        setError('User not authenticated');
        setTasks([]);
        return;
      }
      setCurrentUserId(user.id);

      // Fetch User Projects (Instances, Paginated)
      const { data: projects, error: projError } = await getUserProjects(
        user.id,
        pageNum,
        PAGE_SIZE
      );

      // Fetch Templates (Safe Raw Fetch logic)

      let templates = [];
      try {
        const { data } = await supabase
          .from('tasks_with_primary_resource')
          .select('*')
          .eq('creator', user.id)
          .eq('origin', 'template')
          .is('parent_task_id', null)
          .order('title', { ascending: true });
        templates = data || [];
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Template fetch error', e);
      }

      const tmplError = null; // Suppressed

      if (projError) throw projError;
      if (tmplError) throw tmplError;

      if (!isMountedRef.current) return;

      const newProjects = projects || [];
      const newTemplates = templates || [];

      setTasks((prev) => {
        if (pageNum === 1) return [...newProjects, ...newTemplates];
        return mergeProjects(prev, newProjects); // Append new projects, keep existing templates
      });

      setPage(pageNum);
      setHasMore(newProjects.length === PAGE_SIZE);

      // Fetch Joined Projects (only on first load)
      if (pageNum === 1) {
        const { data: joinedData, error: joinedProjectError } = await getJoinedProjects(user.id);
        if (isMountedRef.current) {
          if (joinedProjectError) setJoinedError('Failed to load joined projects');
          setJoinedProjects(joinedData || []);
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      if (err.name === 'AbortError') {
        console.warn('Fetch projects aborted (harmless)');
        // Do not set error, just keep previous state
      } else {
        console.error('Fetch projects exception:', err);
        setError('Failed to fetch projects');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setIsFetchingMore(false);
      }
    }
  }, []);

  const loadMoreProjects = useCallback(() => {
    if (hasMore && !isFetchingMore) {
      fetchProjects(page + 1);
    }
  }, [hasMore, isFetchingMore, page, fetchProjects]);



  // Pending Mutations (Timestamp-based Reconciliation)
  const pendingMutationsRef = useRef({});

  const applyPendingMutations = useCallback((taskList) => {
    if (Object.keys(pendingMutationsRef.current).length === 0) return taskList;

    return taskList.map(task => {
      const taskId = task.id;
      const pending = pendingMutationsRef.current[taskId];

      if (!pending) return task;

      // Check specific timestamp conflict
      // If server data is NEWER than our mutation, we accept server and clear pending
      const taskTime = task.updated_at ? new Date(task.updated_at).getTime() : 0;
      const mutationTime = pending.timestamp;

      if (taskTime > mutationTime) {
        // Server is newer. Discard pending mutation for this task.
        // We can't delete from Ref during render/map safely without side effects? 
        // Actually, we can mutate the ref, it won't trigger re-render.
        // But doing it inside map is ok if we are careful.
        delete pendingMutationsRef.current[taskId];
        return task;
      }

      // Otherwise, server is stale (or equal). Overlay our mutation.
      return { ...task, ...pending.updates };
    });
  }, []);

  const handleOptimisticUpdate = useCallback((taskId, updates) => {
    // We add a small buffer to 'now' to ensure we beat any immediate race? 
    // Or just use Date.now().
    const timestamp = Date.now();

    pendingMutationsRef.current = {
      ...pendingMutationsRef.current,
      [taskId]: { updates, timestamp }
    };

    // Apply immediately to local state (Roots)
    setTasks(prev => applyPendingMutations(prev.map(t => t.id === taskId ? { ...t, ...updates } : t)));

    // Apply to children
    setHydratedProjects(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(projectId => {
        const list = next[projectId];
        // Check if task is in this list
        if (list.some(t => t.id === taskId)) {
          // We basically re-run applyPendingMutations on the whole list or just single item?
          // Easiest is to just update the specific item optimistically
          next[projectId] = list.map(t => t.id === taskId ? { ...t, ...updates } : t);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [applyPendingMutations]);

  // Explicit commit is largely unnecessary with auto-pruning, but useful for reverts or errors
  const commitOptimisticUpdate = useCallback((taskId) => {
    // Optional: Force clear if needed
    const current = { ...pendingMutationsRef.current };
    delete current[taskId];
    pendingMutationsRef.current = current;
  }, []);

  // Update fetch logic to use applyPendingMutations
  // ... inside mergeProjects loop? No, inside setTasks/setHydratedProjects

  const fetchProjectDetails = useCallback(
    async (projectId) => {
      if (hydratedProjects[projectId]) return;
      try {
        const { data: descendants, error } = await fetchTaskChildren(projectId);
        if (error) throw error;

        // Store flattened children - WITH OVERLAYS
        const rawChildren = descendants.filter((t) => t.id !== projectId);
        const children = applyPendingMutations(rawChildren);

        setHydratedProjects((prev) => ({ ...prev, [projectId]: children }));
        return children;
      } catch (err) {
        console.error('Failed to hydrate project:', err);
      }
    },
    [hydratedProjects, applyPendingMutations]
  );

  const refreshProjectDetails = useCallback(async (projectId) => {
    try {
      const { data: descendants, error } = await fetchTaskChildren(projectId);
      if (error) throw error;
      const rawChildren = descendants.filter((t) => t.id !== projectId);

      // Apply Overlays
      const children = applyPendingMutations(rawChildren);

      setHydratedProjects((prev) => ({ ...prev, [projectId]: children }));
    } catch (err) {
      console.error('Failed to refresh project:', err);
    }
  }, [applyPendingMutations]);

  // Also update fetchProjects/setTasks to use applyPendingMutations?
  // setTasks usually handles Roots.
  // We need to intercept the setTasks calls in fetchProjects.

  // Backwards compatibility alias
  const fetchTasks = useCallback(() => fetchProjects(1), [fetchProjects]);

  // Helper to find task across all stores
  const findTask = useCallback(
    (id) => {
      if (!id) return null;
      const inRoots = tasks.find((t) => t.id === id) || joinedProjects.find((t) => t.id === id);
      if (inRoots) return inRoots;

      for (const projTasks of Object.values(hydratedProjects)) {
        const found = projTasks.find((t) => t.id === id);
        if (found) return found;
      }
      return null;
    },
    [tasks, joinedProjects, hydratedProjects]
  );

  // Check auth state
  const { user: authUser, loading: authLoading } = useAuth();

  useEffect(() => {
    isMountedRef.current = true;
    if (!authLoading && authUser) {
      setCurrentUserId(authUser.id);
      fetchProjects(1);
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchProjects, authLoading, authUser]);

  return {
    tasks,
    setTasks,
    joinedProjects,
    hydratedProjects,
    setHydratedProjects,
    loading,
    error,
    joinedError,
    currentUserId,
    fetchTasks,
    fetchProjects,
    fetchProjectDetails,
    refreshProjectDetails,
    findTask,
    hasMore,
    isFetchingMore,
    loadMoreProjects,
    page,
    // Expose Optimistic Helpers
    handleOptimisticUpdate,
    commitOptimisticUpdate,
  };
};
