import React, { useCallback, useMemo, useState } from 'react';
import { DndContext, closestCorners } from '@dnd-kit/core';

import NewProjectForm from './NewProjectForm';
import NewTaskForm from './NewTaskForm';
import TaskDetailsView from '../templates/TaskDetailsView';
import InviteMemberModal from './InviteMemberModal';
import { ROLES } from '../../constants';
import ErrorBoundary from '../atoms/ErrorBoundary';
import SideNav from './SideNav';
import ProjectTasksView from '../molecules/ProjectTasksView';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useToast } from '../../contexts/ToastContext';

// Hooks & Utils
import { useTaskOperations } from '../../hooks/useTaskOperations';
import { useTaskDrag } from '../../hooks/useTaskDrag';
import { separateTasksByOrigin } from '../../utils/viewHelpers';
import { updateTaskInTree, buildTree } from '../../utils/treeHelpers';
import { fetchTaskChildren } from '../../services/taskService';
import { inviteMember } from '../../services/projectService';

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

  const { addToast } = useToast();

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

  const [isSaving, setIsSaving] = useState(false);

  const handleProjectSubmit = async (formData) => {
    setIsSaving(true);
    try {
      const newProject = await createProject(formData);
      // If we got a new project back (either object or deep clone result)
      // We need to ensure the creator is added as a member for Edge Function checks.
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
      addToast('Task saved successfully', 'success');
    } catch (err) {
      console.error('Failed to save task:', err);
      addToast('Failed to save task. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
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

  // Define sidebar to pass to layout
  const sidebarContent = (
    <SideNav
      joinedProjects={joinedProjects}
      instanceTasks={instanceTasks}
      templateTasks={templateTasks}
      joinedError={joinedError}
      error={error}
      handleSelectProject={handleSelectProject}
      selectedTaskId={activeProjectId}
      loading={loading && instanceTasks.length === 0} // Show skeleton if loading initial data
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
  );

  if (error) {
    return (
      <DashboardLayout sidebar={sidebarContent}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto mt-8">
          <div className="flex items-center">
            <div className="text-red-600 font-semibold">Error loading projects</div>
          </div>
          <div className="text-red-700 text-sm mt-1">{error}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <DashboardLayout sidebar={sidebarContent}>
        <div className="flex h-full gap-6">
          {/* Project View Area - Flex 1 to take remaining space */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {!activeProject ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 py-20">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-slate-700">No Project Selected</h2>
                <p className="max-w-md text-center mb-6">Select a project to view tasks.</p>
                <button
                  onClick={() => {
                    setShowForm(true);
                    setSelectedTask(null);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium"
                >
                  Create New Project
                </button>
              </div>
            ) : (
              <ProjectTasksView
                project={activeProject}
                handleTaskClick={handleTaskClick}
                handleAddChildTask={handleAddChildTask}
                handleEditTask={handleEditTask}
                handleDeleteById={handleDeleteById}
                selectedTaskId={selectedTask?.id}
                onToggleExpand={handleToggleExpand}
                disableDrag={joinedProjects.some((jp) => jp.id === activeProjectId)}
                hydrationError={hydrationError}
                onInviteMember={() => handleOpenInvite(activeProject)}
              />
            )}
          </div>

          {/* Permanent Side Panel (Right) - Details / Forms */}
          {/* Show as slide-over/panel on desktop, fixed full screen or modal on mobile? */}
          {/* For now keeping as side panel but ensuring it fits in flex layout */}
          {(showForm || selectedTask || taskFormState) && (
            <div className="w-[600px] bg-white border-l border-slate-200 flex flex-col flex-shrink-0 shadow-2xl z-10 h-full overflow-hidden transition-all duration-300">
              <div className="pt-8 px-8 pb-6 border-b border-slate-100 flex justify-between items-start bg-white sticky top-0 z-20">
                <h2 className="font-bold text-xl text-slate-800 truncate pr-4">{panelTitle}</h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setTaskFormState(null);
                    setSelectedTask(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
                  aria-label="Close panel"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
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
              // TODO: Use Toast here
              alert('Invitation sent!');
              setInviteModalProject(null);
            }}
          />
        )}
        {isSaving && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="flex items-center space-x-3 rounded-lg bg-white px-6 py-4 shadow-xl">
              <svg
                className="h-6 w-6 animate-spin text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="text-sm font-medium text-slate-700">Saving...</span>
            </div>
          </div>
        )}
      </DashboardLayout>
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
