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



  // Pending Mutations Removed (TanStack Query Migration Prep)
  // Logic simplified to direct state updates via setTasks for now.

  const fetchProjectDetails = useCallback(
    async (projectId) => {
      if (hydratedProjects[projectId]) return;
      try {
        const { data: descendants, error } = await fetchTaskChildren(projectId);
        if (error) throw error;

        // Store flattened children
        const children = descendants.filter((t) => t.id !== projectId);

        setHydratedProjects((prev) => ({ ...prev, [projectId]: children }));
        return children;
      } catch (err) {
        console.error('Failed to hydrate project:', err);
      }
    },
    [hydratedProjects]
  );

  const refreshProjectDetails = useCallback(async (projectId) => {
    try {
      const { data: descendants, error } = await fetchTaskChildren(projectId);
      if (error) throw error;
      const children = descendants.filter((t) => t.id !== projectId);

      setHydratedProjects((prev) => ({ ...prev, [projectId]: children }));
    } catch (err) {
      console.error('Failed to refresh project:', err);
    }
  }, []);

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

  // Rollback / Invalidate helper for Optimistic UI
  const commitOptimisticUpdate = useCallback(
    async (taskId) => {
      // Strategy: Identify context (Project vs Root) and refresh from server to "revert" / "sync"
      const task = findTask(taskId);
      if (task) {
        const rootId =
          task.root_id || (task.parent_task_id ? findTask(task.parent_task_id)?.root_id : null);
        if (rootId) {
          await refreshProjectDetails(rootId);
          return;
        }
      }
      // Fallback: Refresh Global List
      await fetchProjects(page);
    },
    [findTask, refreshProjectDetails, fetchProjects, page]
  );

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
    commitOptimisticUpdate,
  };
};
