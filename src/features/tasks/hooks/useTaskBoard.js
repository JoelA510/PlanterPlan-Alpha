import { useState, useMemo, useCallback } from 'react';
import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';
import { useTaskDrag } from '@features/tasks/hooks/useTaskDrag';
import { useToast } from '@app/contexts/ToastContext';
import { separateTasksByOrigin } from '@shared/lib/viewHelpers';
import { buildTree } from '@shared/lib/treeHelpers';
import { inviteMember } from '@features/projects/services/projectService';
import { ROLES } from '@app/constants/index';

export const useTaskBoard = () => {
  const {
    tasks,
    setTasks,
    joinedProjects,
    hydratedProjects,
    loading,
    error,
    joinedError,
    currentUserId,
    fetchTasks,
    createProject,
    createTaskOrUpdate,
    deleteTask,
    updateTask,
    fetchProjectDetails,
    refreshProjectDetails,
    findTask,
    // Pagination
    hasMore,
    isFetchingMore,
    loadMoreProjects,
    ...rest // Capture handleOptimisticUpdate
  } = useTaskOperations();

  const { addToast } = useToast();

  // Flatten all known tasks for DnD context
  const allTasks = useMemo(() => {
    const descendants = Object.values(hydratedProjects).flat();
    return [...tasks, ...descendants];
  }, [tasks, hydratedProjects]);

  const { sensors, handleDragEnd } = useTaskDrag({
    tasks: allTasks, // Pass ALL tasks so DnD works for subtasks too
    setTasks,
    fetchTasks,
    currentUserId,
    updateTaskStatus: (taskId, status) => updateTask(taskId, { status }),
    handleOptimisticUpdate: rest.handleOptimisticUpdate, // Pass the new helper
  });

  // UI State
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFormState, setTaskFormState] = useState(null);
  const [inviteModalProject, setInviteModalProject] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Expansion State (UI only, decoupled from data)
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());

  // --- Active Project Logic ---
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [hydrationError, setHydrationError] = useState(null);

  // --- Derived State via Helper (must be before activeProject) ---
  const { instanceTasks, templateTasks } = useMemo(() => separateTasksByOrigin(tasks), [tasks]);

  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;

    // Find the root project (Owned or Joined)
    const rootProject =
      instanceTasks.find((t) => t.id === activeProjectId) ||
      templateTasks.find((t) => t.id === activeProjectId) ||
      joinedProjects.find((t) => t.id === activeProjectId);

    if (!rootProject) return null;

    // Check if we have children in cache
    const childrenFlat = hydratedProjects[activeProjectId];

    let childrenTree = [];
    if (childrenFlat) {
      childrenTree = buildTree(childrenFlat, activeProjectId);
    }

    // Apply expansion state recursively helper
    const applyExpansion = (nodes) => {
      return nodes.map((node) => ({
        ...node,
        isExpanded: expandedTaskIds.has(node.id),
        children: applyExpansion(node.children || []),
      }));
    };

    const projectWithTree = {
      ...rootProject,
      children: applyExpansion(childrenTree),
      isExpanded: expandedTaskIds.has(rootProject.id),
    };

    return projectWithTree;
  }, [
    activeProjectId,
    instanceTasks,
    templateTasks,
    joinedProjects,
    hydratedProjects,
    expandedTaskIds,
  ]);

  const handleSelectProject = useCallback(
    async (project) => {
      setActiveProjectId(project.id);
      setSelectedTask(null);
      setShowForm(false);
      setHydrationError(null);

      // Always try to hydrate/fetch details if not present
      if (!hydratedProjects[project.id]) {
        try {
          await fetchProjectDetails(project.id);
        } catch (err) {
          console.error('[TaskList] Failed to hydrate project:', err);
          setHydrationError('Failed to load project tasks.');
        }
      }
    },
    [hydratedProjects, fetchProjectDetails]
  );

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowForm(false);
    setTaskFormState(null);
  };

  const getTaskById = useCallback((taskId) => findTask(taskId), [findTask]);

  // --- Expansion State Handler ---
  const handleToggleExpand = useCallback((task, expanded) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (expanded) next.add(task.id);
      else next.delete(task.id);
      return next;
    });
  }, []);

  const handleAddChildTask = (parentTask) => {
    setTaskFormState({
      mode: 'create',
      origin: parentTask.origin,
      parentId: parentTask.id,
    });
    setShowForm(false);
    setSelectedTask(null);
  };

  const handleEditTask = (task) => {
    setTaskFormState({
      mode: 'edit',
      origin: task.origin,
      parentId: task.parent_task_id || null,
      taskId: task.id,
    });
    setShowForm(false);
    setSelectedTask(task);
  };

  const onDeleteTaskWrapper = useCallback(
    async (task) => {
      const confirmed = window.confirm(
        `Delete "${task.title}" and its subtasks? This action cannot be undone.`
      );
      if (!confirmed) return;
      await deleteTask(task);

      // Invalidate cache if this task belongs to one or IS one
      if (task.root_id && task.root_id !== task.id) {
        refreshProjectDetails(task.root_id);
      }

      if (selectedTask?.id === task.id) setSelectedTask(null);
      if (taskFormState?.taskId === task.id) setTaskFormState(null);
    },
    [deleteTask, selectedTask, taskFormState, refreshProjectDetails]
  );

  const handleDeleteById = useCallback(
    (taskId) => {
      const task = findTask(taskId);
      if (task) {
        onDeleteTaskWrapper(task);
      }
    },
    [findTask, onDeleteTaskWrapper]
  );

  const handleOpenInvite = (project) => {
    setInviteModalProject(project);
  };

  const handleProjectSubmit = async (formData) => {
    setIsSaving(true);
    try {
      const newProject = await createProject(formData);
      if (newProject) {
        const newProjectId = newProject.new_root_id || newProject.id;
        if (newProjectId && currentUserId) {
          await inviteMember(newProjectId, currentUserId, ROLES.OWNER);
        }
      }
      addToast('Project created successfully!', 'success');
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create project:', err);
      addToast('Failed to create project. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTaskSubmit = async (formData) => {
    setIsSaving(true);
    try {
      await createTaskOrUpdate(formData, taskFormState);
      if (activeProjectId) {
        refreshProjectDetails(activeProjectId);
      } else if (taskFormState?.parentId) {
        const parent = findTask(taskFormState.parentId);
        if (parent && (parent.root_id || parent.id)) {
          refreshProjectDetails(parent.root_id || parent.id);
        }
      }

      setTaskFormState(null);
      addToast('Task saved successfully', 'success');
    } catch (err) {
      console.error('Failed to save task:', err);
      addToast('Failed to save task. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // Data
    joinedProjects,
    instanceTasks,
    templateTasks,
    loading,
    error,
    joinedError,
    activeProjectId,
    activeProject,
    hydrationError,

    // Pagination
    hasMore,
    isFetchingMore,
    loadMoreProjects,

    // UI State
    showForm,
    setShowForm,
    selectedTask,
    setSelectedTask,
    taskFormState,
    setTaskFormState,
    inviteModalProject,
    setInviteModalProject,
    isSaving,

    // Handlers
    handleSelectProject,
    handleTaskClick,
    handleToggleExpand,
    handleAddChildTask,
    handleEditTask,
    onDeleteTaskWrapper,
    handleDeleteById,
    handleOpenInvite,
    handleProjectSubmit,
    handleTaskSubmit,
    getTaskById,
    fetchTasks, // Exposed for TaskDetailsView
    updateTask,

    // DND
    sensors,
    handleDragEnd,
  };
};
