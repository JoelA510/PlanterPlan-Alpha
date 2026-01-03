import React, { useCallback, useMemo, useState } from 'react';
import { DndContext, closestCorners } from '@dnd-kit/core';

import NewProjectForm from './NewProjectForm';
import NewTaskForm from './NewTaskForm';
import TaskDetailsView from '../templates/TaskDetailsView';
import InviteMemberModal from './InviteMemberModal';
import ErrorBoundary from '../atoms/ErrorBoundary';
import SideNav from './SideNav';
import ProjectTasksView from '../molecules/ProjectTasksView';

// Hooks & Utils
import { useTaskOperations } from '../../hooks/useTaskOperations';
import { useTaskDrag } from '../../hooks/useTaskDrag';
import { separateTasksByOrigin } from '../../utils/viewHelpers';
import { updateTaskInTree, buildTree } from '../../utils/treeHelpers';
import { fetchTaskChildren } from '../../services/taskService';

const TaskList = () => {
  const {
    tasks,
    setTasks,
    joinedProjects,
    loading,
    error,
    joinedError,
    currentUserId,
    fetchTasks,
    createProject,
    createTaskOrUpdate,
    deleteTask,
  } = useTaskOperations();

  const { sensors, handleDragEnd } = useTaskDrag({
    tasks,
    setTasks,
    fetchTasks,
    currentUserId,
  });

  // UI State
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFormState, setTaskFormState] = useState(null);
  const [inviteModalProject, setInviteModalProject] = useState(null);

  // --- Active Project Logic ---
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [hydratedJoinedProjects, setHydratedJoinedProjects] = useState({});
  const [hydrationError, setHydrationError] = useState(null);

  // --- Derived State via Helper (must be before activeProject) ---
  const { instanceTasks, templateTasks } = useMemo(() => separateTasksByOrigin(tasks), [tasks]);

  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    // Try owned instance projects first (hierarchical with children)
    const ownedInstance = instanceTasks.find((t) => t.id === activeProjectId);
    if (ownedInstance) return ownedInstance;
    // Try owned template projects (hierarchical with children)
    const ownedTemplate = templateTasks.find((t) => t.id === activeProjectId);
    if (ownedTemplate) return ownedTemplate;
    // Then try hydrated joined projects (with fetched children)
    if (hydratedJoinedProjects[activeProjectId]) {
      return hydratedJoinedProjects[activeProjectId];
    }
    // Fallback to unhydrated joined project (will show loading state)
    return joinedProjects.find((t) => t.id === activeProjectId) || null;
  }, [activeProjectId, instanceTasks, templateTasks, joinedProjects, hydratedJoinedProjects]);

  const handleSelectProject = useCallback(
    async (project) => {
      setActiveProjectId(project.id);
      setSelectedTask(null);
      setShowForm(false);

      // Check if this is a joined project that needs hydration
      const isJoinedProject = joinedProjects.some((jp) => jp.id === project.id);
      const alreadyHydrated = !!hydratedJoinedProjects[project.id];

      if (isJoinedProject && !alreadyHydrated) {
        setHydrationError(null);
        try {
          const descendants = await fetchTaskChildren(project.id);
          // Build tree from flat list (children of this project)
          const childTasks = descendants.filter((d) => d.id !== project.id);
          const childTree = buildTree(childTasks, project.id);
          // Create hydrated project with children
          const hydratedProject = { ...project, children: childTree };
          setHydratedJoinedProjects((prev) => ({
            ...prev,
            [project.id]: hydratedProject,
          }));
        } catch (err) {
          console.error('[TaskList] Failed to hydrate joined project:', err);
          setHydrationError('Failed to load project tasks. Please try again.');
        }
      }
    },
    [joinedProjects, hydratedJoinedProjects]
  );

  // --- Cache Invalidation ---
  // Invalidate a joined project's hydrated cache so it re-fetches on next click
  const invalidateJoinedProjectCache = useCallback(
    (projectId) => {
      if (projectId && hydratedJoinedProjects[projectId]) {
        setHydratedJoinedProjects((prev) => {
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
      }
    },
    [hydratedJoinedProjects]
  );

  // --- Handlers ---

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowForm(false);
    setTaskFormState(null);
  };

  const getTaskById = useCallback(
    (taskId) => {
      if (taskId === null || taskId === undefined) return null;
      return tasks.find((task) => task.id === taskId) || null;
    },
    [tasks]
  );

  // --- Expansion State Handler ---
  // Toggles isExpanded on a task within the tasks tree (owned or joined)
  const handleToggleExpand = useCallback(
    (task, expanded) => {
      // Update owned tasks tree
      setTasks((prev) => updateTaskInTree(prev, task.id, { isExpanded: expanded }));

      // Also update hydrated joined projects if the task belongs to one
      const joinedProjectId = task.root_id || task.id;
      if (hydratedJoinedProjects[joinedProjectId]) {
        setHydratedJoinedProjects((prev) => {
          const project = prev[joinedProjectId];
          if (!project) return prev;
          // Update the task within the joined project's children tree
          const updatedChildren = updateTaskInTree(project.children || [], task.id, {
            isExpanded: expanded,
          });
          // Also handle if the toggled task is the project root itself
          const updatedProject =
            project.id === task.id
              ? { ...project, isExpanded: expanded, children: updatedChildren }
              : { ...project, children: updatedChildren };
          return { ...prev, [joinedProjectId]: updatedProject };
        });
      }
    },
    [setTasks, hydratedJoinedProjects]
  );

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

      // Invalidate joined project cache if this task belongs to one
      const projectId = task.root_id || task.id;
      invalidateJoinedProjectCache(projectId);

      if (selectedTask?.id === task.id) setSelectedTask(null);
      if (taskFormState?.taskId === task.id) setTaskFormState(null);
    },
    [deleteTask, selectedTask, taskFormState, invalidateJoinedProjectCache]
  );

  // Helper to find a task in hydrated joined project trees
  const findTaskInHydratedProjects = useCallback(
    (taskId) => {
      for (const projectId of Object.keys(hydratedJoinedProjects)) {
        const project = hydratedJoinedProjects[projectId];
        if (project.id === taskId) return project;
        // Search recursively in children
        const findInChildren = (children) => {
          for (const child of children || []) {
            if (child.id === taskId) return child;
            const found = findInChildren(child.children);
            if (found) return found;
          }
          return null;
        };
        const found = findInChildren(project.children);
        if (found) return found;
      }
      return null;
    },
    [hydratedJoinedProjects]
  );

  const handleDeleteById = useCallback(
    (taskId) => {
      // Search owned tasks, top-level joined projects, then hydrated joined project children
      const task =
        tasks.find((t) => t.id === taskId) ||
        joinedProjects.find((t) => t.id === taskId) ||
        findTaskInHydratedProjects(taskId);
      if (task) {
        onDeleteTaskWrapper(task);
      }
    },
    [tasks, joinedProjects, findTaskInHydratedProjects, onDeleteTaskWrapper]
  );

  const handleOpenInvite = (project) => {
    setInviteModalProject(project);
  };

  const handleProjectSubmit = async (formData) => {
    await createProject(formData);
    setShowForm(false);
  };

  const handleTaskSubmit = async (formData) => {
    await createTaskOrUpdate(formData, taskFormState);

    // Invalidate joined project cache if editing/creating in a joined project.
    // We check multiple sources since the task might be in a joined project:
    // 1. If activeProjectId is a joined project, invalidate it
    // 2. If parentTask has a root_id pointing to a joined project, invalidate that
    const isActiveJoinedProject =
      activeProjectId && joinedProjects.some((jp) => jp.id === activeProjectId);
    if (isActiveJoinedProject) {
      invalidateJoinedProjectCache(activeProjectId);
    } else if (taskFormState?.parentId) {
      // Fallback: check if parent is in owned tasks and belongs to a joined project
      const parentTask = getTaskById(taskFormState.parentId);
      if (parentTask) {
        const projectId = parentTask.root_id || parentTask.id;
        invalidateJoinedProjectCache(projectId);
      }
    }

    setTaskFormState(null);
  };

  // --- Render Helpers ---

  const parentTaskForForm = taskFormState?.parentId ? getTaskById(taskFormState.parentId) : null;
  const taskBeingEdited =
    taskFormState?.mode === 'edit' && taskFormState.taskId
      ? getTaskById(taskFormState.taskId)
      : null;
  const isTaskFormOpen = Boolean(taskFormState);

  const panelTitle = useMemo(() => {
    if (showForm) return 'New Project';
    if (taskFormState) {
      if (taskFormState.mode === 'edit') {
        return taskBeingEdited ? `Edit ${taskBeingEdited.title}` : 'Edit Task';
      }
      if (taskFormState.origin === 'template') {
        return parentTaskForForm
          ? `New Template Task in ${parentTaskForForm.title}`
          : 'New Template Task';
      }
      return parentTaskForForm ? `New Task in ${parentTaskForForm.title}` : 'New Task';
    }
    if (selectedTask) return selectedTask.title;
    return 'Details';
  }, [showForm, taskFormState, taskBeingEdited, parentTaskForForm, selectedTask]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          <span className="text-slate-600 font-medium">Loading your projects...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-600 font-semibold">Error loading projects</div>
        </div>
        <div className="text-red-700 text-sm mt-1">{error}</div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="app-layout">
        <SideNav
          joinedProjects={joinedProjects}
          instanceTasks={instanceTasks}
          templateTasks={templateTasks}
          joinedError={joinedError}
          handleSelectProject={handleSelectProject}
          selectedTaskId={activeProjectId} // Highlight the active project in nav
          handleOpenInvite={handleOpenInvite}
          handleAddChildTask={handleAddChildTask}
          onNewProjectClick={() => {
            setShowForm(true);
            setSelectedTask(null);
            setTaskFormState(null);
          }}
          onNewTemplateClick={() => {
            setTaskFormState({
              mode: 'create',
              origin: 'template',
              parentId: null,
            });
            setShowForm(false);
            setSelectedTask(null);
          }}
        />

        <div className="main-content">
          <div className="project-view-area">
            {!activeProject ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <h2 className="text-xl font-semibold mb-2">Welcome to PlanterPlan</h2>
                <p>Select a project from the sidebar to view its tasks.</p>
              </div>
            ) : (
              <ProjectTasksView
                project={activeProject}
                handleTaskClick={handleTaskClick} // Clicking a task in the board opens details
                handleAddChildTask={handleAddChildTask}
                handleOpenInvite={handleOpenInvite}
                handleEditTask={handleEditTask}
                handleDeleteById={handleDeleteById}
                selectedTaskId={selectedTask?.id}
                onToggleExpand={handleToggleExpand}
                disableDrag={joinedProjects.some((jp) => jp.id === activeProjectId)}
                hydrationError={hydrationError}
              />
            )}
          </div>

          {/* Permanent Side Panel (Right) - Details / Forms */}
          {(showForm || selectedTask || taskFormState) && (
            <div className="permanent-side-panel">
              <div className="panel-header">
                <h2 className="panel-title">{panelTitle}</h2>
                {showForm && (
                  <button onClick={() => setShowForm(false)} className="panel-header-btn">
                    Hide Form
                  </button>
                )}
                {isTaskFormOpen && (
                  <button onClick={() => setTaskFormState(null)} className="panel-header-btn">
                    Cancel
                  </button>
                )}
                {selectedTask && !showForm && !isTaskFormOpen && (
                  <button onClick={() => setSelectedTask(null)} className="panel-header-btn">
                    Close
                  </button>
                )}
              </div>
              <div className="panel-content">
                {showForm ? (
                  <NewProjectForm
                    onSubmit={handleProjectSubmit}
                    onCancel={() => setShowForm(false)}
                  />
                ) : isTaskFormOpen ? (
                  <NewTaskForm
                    parentTask={parentTaskForForm}
                    initialTask={taskBeingEdited}
                    origin={taskFormState?.origin}
                    enableLibrarySearch={taskFormState?.mode !== 'edit'}
                    submitLabel={taskFormState?.mode === 'edit' ? 'Save Changes' : 'Add Task'}
                    onSubmit={handleTaskSubmit}
                    onCancel={() => setTaskFormState(null)}
                  />
                ) : selectedTask ? (
                  <TaskDetailsView
                    task={selectedTask}
                    onAddChildTask={handleAddChildTask}
                    onEditTask={handleEditTask}
                    onDeleteTask={onDeleteTaskWrapper}
                    onTaskUpdated={fetchTasks}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>

        {inviteModalProject && (
          <InviteMemberModal
            project={inviteModalProject}
            onClose={() => setInviteModalProject(null)}
            onInviteSuccess={() => {
              // TODO: Replace with a toast notification for better UX.
              // For example: toast.success('Invitation sent!');
              alert('Invitation sent!');
              setInviteModalProject(null);
            }}
          />
        )}
      </div>
    </DndContext>
  );
};

// Export wrapped component
const TaskListWithErrorBoundary = (props) => (
  <ErrorBoundary name="TaskList">
    <TaskList {...props} />
  </ErrorBoundary>
);

export default TaskListWithErrorBoundary;
