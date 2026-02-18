import { useState, useMemo, useCallback } from 'react';
import { useTaskOperations } from '@/features/tasks/hooks/useTaskOperations';
import { useToast } from '@/app/contexts/ToastContext';
import { inviteMember } from '@/features/projects/services/projectService';
import { ROLES } from '@/app/constants/index';

// Composed Hooks
import { useProjectSelection } from './useProjectSelection';
import { useTaskTree } from './useTaskTree';
import { useTaskDragAndDrop } from './useTaskDragAndDrop';

// Extract this because it's used in the logic but was implicit before
import { useParams } from 'react-router-dom';

export const useTaskBoard = () => {
  // 0. Routing Context
  const { projectId: urlProjectId } = useParams();
  const { addToast } = useToast();

  // 1. Data & Operations (Base Layer)
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
    hasMore,
    isFetchingMore,
    loadMoreProjects,
    ...rest // Capture handleOptimisticUpdate
  } = useTaskOperations();

  // 2. Project Selection & Hydration
  const { activeProjectId, handleSelectProject, hydrationError, setHydrationError } = useProjectSelection({
    urlProjectId,
    instanceTasks: useMemo(() => tasks.filter(t => t.origin === 'instance'), [tasks]), // Optimization: pass filtered or raw? useProjectSelection filters anyway.
    templateTasks: useMemo(() => tasks.filter(t => t.origin === 'template'), [tasks]),
    joinedProjects,
    hydratedProjects,
    fetchProjectDetails,
    loading,
  });

  // 3. Tree Structure & Expansion
  const { instanceTasks, templateTasks, activeProject, expandedTaskIds, handleToggleExpand } = useTaskTree({
    tasks,
    hydratedProjects,
    activeProjectId,
    joinedProjects
  });

  // 4. Drag & Drop
  const { sensors, handleDragEnd, allTasks } = useTaskDragAndDrop({
    tasks,
    hydratedProjects,
    setTasks,
    fetchTasks,
    currentUserId,
    updateTask,
    handleOptimisticUpdate: rest.handleOptimisticUpdate,
    commitOptimisticUpdate: rest.commitOptimisticUpdate,
  });

  // 5. UI State (Forms, Modals) - Kept here for now as "Board UI State"
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFormState, setTaskFormState] = useState(null);
  const [inviteModalProject, setInviteModalProject] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- Handlers (Adapters for UI) ---

  const handleSelectProjectWrapper = useCallback((project) => {
    handleSelectProject(project);
    // Reset UI state on project switch
    setSelectedTask(null);
    setShowForm(false);
  }, [handleSelectProject]);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowForm(false);
    setTaskFormState(null);
  };

  const getTaskById = useCallback((taskId) => findTask(taskId), [findTask]);

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
    handleSelectProject: handleSelectProjectWrapper,
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
    fetchTasks,
    updateTask,

    // DND
    sensors,
    handleDragEnd,
  };
};
