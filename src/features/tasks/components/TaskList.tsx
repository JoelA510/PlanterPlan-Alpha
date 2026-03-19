import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTaskQuery } from '@/features/tasks/hooks/useTaskQuery';
import { useUpdateTask, useCreateTask, useDeleteTask } from '@/features/tasks/hooks/useTaskMutations';
import { buildTree, separateTasksByOrigin } from '@/shared/lib/tree-helpers';
import type { TaskNode } from '@/shared/lib/tree-helpers';
import { Project, TaskRow, SelectableProject, TaskFormData } from '@/shared/db/app.types';
import React from 'react';
import { useProjectData } from '@/features/projects/hooks/useProjectData';
import ProjectSidebar from '@/features/navigation/components/ProjectSidebar';
import ProjectTasksView from './ProjectTasksView';
import DashboardLayout from '@/layouts/DashboardLayout';
import TaskDetailsPanel from '@/features/tasks/components/TaskDetailsPanel';
import EmptyProjectState from '@/features/tasks/components/EmptyProjectState';
import StatusCard from '@/shared/ui/StatusCard';
import { toast } from 'sonner';

export interface TaskFormState {
  mode: 'create' | 'edit';
  origin?: string;
  parentId?: string | null;
  taskId?: string;
}

const TaskList = () => {
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();

  // --- Data Fetching ---
  const {
    tasks,
    loading,
    projectsLoading,
    joinedLoading,
    templatesLoading,
    error,
    refetchProjects,
    joinedProjects,
    findTask,
  } = useTaskQuery();

  const { mutateAsync: updateTaskAsync } = useUpdateTask();
  const { mutateAsync: createTaskAsync } = useCreateTask();
  const { mutateAsync: deleteTaskAsync } = useDeleteTask();

  const { instanceTasks, templateTasks } = useMemo(() => separateTasksByOrigin(tasks), [tasks]);

  // --- Project Selection (was useProjectSelection) ---
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const handleSelectProject = useCallback(
    async (project: SelectableProject): Promise<void> => {
      setActiveProjectId(project.id);
    },
    []
  );

  useEffect(() => {
    if (urlProjectId && urlProjectId !== activeProjectId && !loading) {
      const project =
        instanceTasks.find((p) => p.id === urlProjectId) ||
        templateTasks.find((p) => p.id === urlProjectId) ||
        (joinedProjects || []).find((p: any) => p.id === urlProjectId);

      if (project) {
        handleSelectProject(project as SelectableProject);
      }
    }
  }, [urlProjectId, activeProjectId, loading, instanceTasks, templateTasks, joinedProjects, handleSelectProject]);

  // --- Project Hierarchy ---
  const { projectHierarchy } = useProjectData(activeProjectId);

  const hydratedProjects = React.useMemo(() => {
    if (!activeProjectId || !projectHierarchy || projectHierarchy.length === 0) return {};
    return { [activeProjectId]: projectHierarchy };
  }, [activeProjectId, projectHierarchy]);

  // --- Expanded Tasks (was useExpandedTasks) ---
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  const handleToggleExpand = useCallback((task: { id: string }, expanded: boolean) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (expanded) next.add(task.id);
      else next.delete(task.id);
      return next;
    });
  }, []);

  // --- Task Tree (was useTaskTree) ---
  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;

    const rootProject =
      instanceTasks.find((t) => t.id === activeProjectId) ||
      templateTasks.find((t) => t.id === activeProjectId) ||
      (joinedProjects || []).find((t: any) => t.id === activeProjectId);

    if (!rootProject) return null;

    const childrenFlat = (hydratedProjects as Record<string, any[]>)[activeProjectId];

    let childrenTree: TaskNode[] = [];
    if (childrenFlat) {
      childrenTree = buildTree(childrenFlat, activeProjectId);
    }

    const applyExpansion = (nodes: TaskNode[]): TaskNode[] => {
      return nodes.map((node) => ({
        ...node,
        isExpanded: expandedTaskIds.has(node.id),
        children: applyExpansion(node.children || []),
      }));
    };

    return {
      ...rootProject,
      children: applyExpansion(childrenTree),
      isExpanded: expandedTaskIds.has(rootProject.id),
    };
  }, [activeProjectId, instanceTasks, templateTasks, joinedProjects, hydratedProjects, expandedTaskIds]);

  // --- Board UI State (was useTaskBoardUI) ---
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [taskFormState, setTaskFormState] = useState<TaskFormState | null>(null);

  // --- Handle URL action params (e.g. ?action=new-template) ---
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new-template') {
      setSelectedTask(null);
      setTaskFormState({ mode: 'create', origin: 'template', parentId: null });
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleAddChildTask = useCallback((parentTask: TaskRow) => {
    setTaskFormState({
      mode: 'create',
      origin: parentTask.origin || undefined,
      parentId: parentTask.id,
    });
    setShowForm(false);
    setSelectedTask(null);
  }, []);

  const handleEditTask = useCallback((task: TaskRow) => {
    setTaskFormState({
      mode: 'edit',
      origin: task.origin || undefined,
      parentId: task.parent_task_id || null,
      taskId: task.id,
    });
    setShowForm(false);
    setSelectedTask(task);
  }, []);

  const onDeleteTaskWrapper = useCallback(
    async (task: TaskRow) => {
      const confirmed = window.confirm(
        `Delete "${task.title}" and its subtasks? This action cannot be undone.`
      );
      if (!confirmed) return;

      try {
        await deleteTaskAsync({ id: task.id, root_id: task.root_id });
        if (task.root_id && task.root_id !== task.id) {
          refetchProjects();
        }
        if (selectedTask?.id === task.id) setSelectedTask(null);
        if (taskFormState?.taskId === task.id) setTaskFormState(null);
        toast.success('Task deleted successfully');
      } catch (err) {
        console.error('Failed to delete task:', err);
        toast.error('Failed to delete task');
      }
    },
    [deleteTaskAsync, selectedTask, taskFormState, refetchProjects]
  );

  const handleDeleteById = useCallback(
    (taskId: string) => {
      const task = findTask(taskId);
      if (task) {
        onDeleteTaskWrapper(task as TaskRow);
      }
    },
    [findTask, onDeleteTaskWrapper]
  );

  const createTaskOrUpdateWrapper = async (data: TaskFormData, state: TaskFormState | null) => {
    if (state?.mode === 'edit' && state?.taskId) {
      return updateTaskAsync({ id: state.taskId, ...data } as any);
    }
    return createTaskAsync({ ...data, root_id: activeProjectId || null, origin: state?.origin || 'instance', parent_task_id: state?.parentId || null } as any);
  };

  const handleTaskSubmit = async (formData: TaskFormData) => {
    try {
      await createTaskOrUpdateWrapper(formData, taskFormState);
      if (activeProjectId) {
        refetchProjects();
      } else if (taskFormState?.parentId) {
        const parent = findTask(taskFormState.parentId);
        if (parent && ((parent as any).root_id || parent.id)) {
          refetchProjects();
        }
      }
      setTaskFormState(null);
      toast.success('Task saved successfully');
    } catch (err) {
      console.error('Failed to save task:', err);
      toast.error('Failed to save task. Please try again.');
    }
  };

  // --- Derived state for TaskDetailsPanel ---
  const parentTaskForForm = taskFormState?.parentId ? (findTask(taskFormState.parentId) || (projectHierarchy as any[]).find((t: any) => t.id === taskFormState.parentId)) : null;
  const taskBeingEdited = taskFormState?.mode === 'edit' && taskFormState.taskId
    ? (findTask(taskFormState.taskId) || (projectHierarchy as any[]).find((t: any) => t.id === taskFormState.taskId))
    : null;

  const sidebarContent = (
    <ProjectSidebar
      joinedProjects={(joinedProjects as Project[]) || []}
      instanceTasks={instanceTasks as TaskRow[]}
      templateTasks={templateTasks as TaskRow[]}
      projectsLoading={projectsLoading}
      joinedLoading={joinedLoading}
      templatesLoading={templatesLoading}
      error={error as string | null}
      handleSelectProject={handleSelectProject as (p: SelectableProject) => Promise<void>}
      selectedTaskId={activeProjectId}
      onNewProjectClick={() => navigate('/projects/new')}
      onNewTemplateClick={() => {
        setSelectedTask(null);
        setTaskFormState({ mode: 'create', origin: 'template', parentId: null });
      }}
    />
  );

  if (error) {
    return (
      <DashboardLayout sidebar={sidebarContent}>
        <StatusCard
          title="Error Loading Projects"
          description={error}
          variant="error"
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={sidebarContent}>
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
        {activeProject ? (
          <ProjectTasksView
            project={activeProject as any}
            handleTaskClick={handleEditTask as any}
            handleAddChildTask={handleAddChildTask as any}
            handleEditTask={handleEditTask as any}
            handleDeleteById={handleDeleteById as any}
            onToggleExpand={handleToggleExpand as any}
            onStatusChange={(_, status) => updateTaskAsync({ id: _, updates: { status } } as any)}
            disableDrag={joinedProjects?.some((jp: any) => jp.id === activeProjectId)}
          />
        ) : (
          <EmptyProjectState
            onCreateProject={() => navigate('/projects/new')}
          />
        )}

        <TaskDetailsPanel
          showForm={showForm}
          taskFormState={taskFormState as any}
          selectedTask={selectedTask as any}
          taskBeingEdited={taskBeingEdited as any}
          parentTaskForForm={parentTaskForForm as any}
          onClose={() => setSelectedTask(null)}
          handleTaskSubmit={handleTaskSubmit}
          setTaskFormState={setTaskFormState as any}
          handleAddChildTask={handleAddChildTask as any}
          handleEditTask={handleEditTask as any}
          onDeleteTaskWrapper={onDeleteTaskWrapper as any}
          fetchTasks={refetchProjects}
        />
      </div>
    </DashboardLayout>
  );
};

export default TaskList;
