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

      // Fetch Templates (Naive: Fetch all for now or create service)
      const { data: templates, error: tmplError } = await supabase
        .from('tasks_with_primary_resource')
        .select('*')
        .eq('creator', user.id)
        .eq('origin', 'template')
        .is('parent_task_id', null)
        .order('title', { ascending: true });

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

  const fetchProjectDetails = useCallback(
    async (projectId) => {
      // Allow force-refresh if not checking specific cache state here?
      // But hydratedProjects is needed to check cache.
      if (hydratedProjects[projectId]) return; // Already loaded
      try {
        const { data: descendants, error } = await fetchTaskChildren(projectId);
        if (error) throw error;

        // Store flattened children (excluding root since it's in 'tasks' or 'joinedProjects')
        const children = descendants.filter((t) => t.id !== projectId);
        setHydratedProjects((prev) => ({ ...prev, [projectId]: children }));
        return children;
      } catch (err) {
        console.error('Failed to hydrate project:', err);
        // Optional: expose hydration error
      }
    },
    [hydratedProjects]
  );

  // Force reload of a specific project's details
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
    setHydratedProjects, // Exposed for mutations if needed? Or keep read-only? Mutations might need to update it?
    // Actually useTaskMutations might trigger refreshes, so strict separation might be hard.
    // But we exposed refreshProjectDetails.
    loading,
    error,
    joinedError,
    currentUserId,

    fetchTasks,
    fetchProjects,
    fetchProjectDetails,
    refreshProjectDetails,

    findTask,

    // Pagination
    hasMore,
    isFetchingMore,
    loadMoreProjects,

    page,
  };
};
