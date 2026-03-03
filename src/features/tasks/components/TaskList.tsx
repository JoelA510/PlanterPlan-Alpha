import { useMemo } from 'react';
import { DndContext, closestCorners } from '@dnd-kit/core';
import { useParams, useNavigate } from 'react-router-dom';

import { InviteMemberModal, NewProjectForm } from '@/features/projects';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from '@/shared/ui/ErrorFallback';

import { ProjectSidebar } from '@/features/navigation';
import ProjectTasksView from './ProjectTasksView';
import DashboardLayout from '@layouts/DashboardLayout';
import TaskDetailsPanel from '@/features/tasks/components/TaskDetailsPanel';
import EmptyProjectState from '@/features/tasks/components/EmptyProjectState';
import { MasterLibrarySearch } from '@/features/library';
import StatusCard from '@/shared/ui/StatusCard';
import type { CreateProjectPayload, CreateTemplatePayload } from '@/features/dashboard';

// Hooks & Utils
import { useTaskQuery } from '@/features/tasks/hooks/useTaskQuery';
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/features/tasks/hooks/useTaskMutations';
import { useCreateProject } from '@/features/projects';
import { useProjectSelection } from '@/features/tasks/hooks/useProjectSelection';
import { useTaskTree } from '@/features/tasks/hooks/useTaskTree';
import { useTaskDragAndDrop } from '@/features/tasks/hooks/useTaskDragAndDrop';
import { useTaskBoardUI, TaskFormState } from '@/features/tasks/hooks/useTaskBoardUI';
import { TaskRow, TaskInsert, TaskUpdate } from '@/shared/db/app.types';

const TaskList = () => {
    const { projectId: urlProjectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();

    // 1. Core Data Layer
    const {
        tasks,
        joinedProjects,
        hydratedProjects,
        loading,
        error,
        joinedError,
        currentUserId,
        hasMore,
        isFetchingMore,
        loadMoreProjects,
        refetchProjects,
        findTask,
    } = useTaskQuery();

    const { mutateAsync: createProjectAsync } = useCreateProject();
    const { mutateAsync: createTaskAsync } = useCreateTask();
    const { mutateAsync: updateTaskAsync } = useUpdateTask();
    const { mutateAsync: deleteTaskAsync } = useDeleteTask();

    const createProject = async (data: CreateProjectPayload | CreateTemplatePayload) => createProjectAsync(data);
    const createTaskOrUpdate = async (data: TaskInsert | TaskUpdate, state: TaskFormState | null) => {
        if (state?.mode === 'create') {
            return createTaskAsync(data as TaskInsert);
        } else {
            return updateTaskAsync(data as TaskUpdate & { id: string });
        }
    };
    const deleteTask = async (task: TaskRow) => deleteTaskAsync({ id: task.id, root_id: task.root_id || undefined });

    // Legacy stubs for contexts that expect manual state manipulation
    const fetchTasks = useCallback(() => refetchProjects(), [refetchProjects]);
    const fetchProjectDetails = useCallback(() => refetchProjects(), [refetchProjects]);
    const refreshProjectDetails = useCallback(() => refetchProjects(), [refetchProjects]);
    const setTasks = () => { };
    const handleOptimisticUpdate = () => { };
    const commitOptimisticUpdate = () => { };

    // 2. Project Selection Layer
    const { activeProjectId, handleSelectProject, hydrationError } = useProjectSelection({
        urlProjectId,
        instanceTasks: useMemo(() => tasks.filter((t: TaskRow) => t.origin === 'instance'), [tasks]),
        templateTasks: useMemo(() => tasks.filter((t: TaskRow) => t.origin === 'template'), [tasks]),
        joinedProjects,
        hydratedProjects: hydratedProjects,
        fetchProjectDetails,
        loading,
    });

    // 3. Tree & UI Structure Layer
    const { activeProject, handleToggleExpand, instanceTasks, templateTasks } = useTaskTree({
        tasks,
        hydratedProjects: hydratedProjects,
        activeProjectId,
        joinedProjects,
    });

    // 4. Interaction Layer (DnD)
    const { sensors, handleDragEnd } = useTaskDragAndDrop({
        tasks,
        hydratedProjects: hydratedProjects,
        setTasks,
        fetchTasks,
        currentUserId,
        updateTask: updateTaskAsync,
        handleOptimisticUpdate,
        commitOptimisticUpdate,
    });

    // 5. UI State & Orchestration Layer
    const {
        showForm,
        setShowForm,
        selectedTask,
        setSelectedTask,
        taskFormState,
        setTaskFormState,
        inviteModalProject,
        setInviteModalProject,
        handleTaskClick,
        handleAddChildTask,
        handleEditTask,
        handleDeleteById,
        handleOpenInvite,
        handleProjectSubmit,
        handleTaskSubmit,
        onDeleteTaskWrapper
    } = useTaskBoardUI({
        currentUserId,
        createProject,
        createTaskOrUpdate,
        deleteTask,
        refreshProjectDetails,
        findTask,
        activeProjectId,
    });

    const handleSelectProjectWrapper = (project: TaskRow) => {
        handleSelectProject(project);
        setSelectedTask(null);
        setShowForm(false);
        setTaskFormState(null);
        navigate(`/project/${project.id}`);
    };

    const getTaskById = (taskId: string) => findTask(taskId);

    const parentTaskForForm = taskFormState?.parentId ? getTaskById(taskFormState.parentId) : null;
    const taskBeingEdited =
        taskFormState?.mode === 'edit' && taskFormState.taskId
            ? getTaskById(taskFormState.taskId)
            : null;

    const sidebarContent = (
        <ProjectSidebar
            joinedProjects={joinedProjects}
            instanceTasks={instanceTasks}
            templateTasks={templateTasks}
            joinedError={joinedError}
            error={error}
            handleSelectProject={handleSelectProjectWrapper}
            selectedTaskId={activeProjectId}
            loading={loading && instanceTasks.length === 0}
            hasMore={hasMore}
            isFetchingMore={isFetchingMore}
            onLoadMore={loadMoreProjects}
            handleOpenInvite={handleOpenInvite}
            handleAddChildTask={handleAddChildTask}
            onNewProjectClick={() => {
                setShowForm(true);
                setSelectedTask(null);
                setTaskFormState(null);
                navigate('/dashboard');
            }}
            onNewTemplateClick={() => {
                setTaskFormState({
                    mode: 'create',
                    origin: 'template',
                    parentId: null,
                });
                setShowForm(false);
                setSelectedTask(null);
                navigate('/dashboard');
            }}
        />
    );

    const handleStatusChange = useCallback((taskId: string, status: string) => {
        return updateTaskAsync({
            id: taskId,
            status,
            is_complete: status === 'completed',
        });
    }, [updateTaskAsync]);

    if (error) {
        return (
            <DashboardLayout sidebar={sidebarContent}>
                <div className="mt-8 mx-auto max-w-2xl">
                    <StatusCard
                        title="Error loading projects"
                        description={error}
                        variant="error"
                    />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <DashboardLayout sidebar={sidebarContent}>
                <div className="flex h-full gap-8">
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {!activeProject ? (
                            <EmptyProjectState
                                onCreateProject={() => {
                                    setShowForm(true);
                                    setSelectedTask(null);
                                }}
                            />
                        ) : (
                            <ProjectTasksView
                                project={activeProject}
                                handleTaskClick={handleTaskClick}
                                handleAddChildTask={handleAddChildTask}
                                handleEditTask={handleEditTask}
                                handleDeleteById={handleDeleteById}
                                selectedTaskId={selectedTask?.id}
                                onToggleExpand={handleToggleExpand}
                                disableDrag={joinedProjects.some((jp: TaskRow) => jp.id === activeProjectId)}
                                hydrationError={hydrationError}
                                onInviteMember={() => handleOpenInvite(activeProject)}
                                onStatusChange={handleStatusChange}
                            />
                        )}
                    </div>

                    {(showForm || selectedTask || taskFormState) && (
                        <TaskDetailsPanel
                            showForm={showForm}
                            taskFormState={taskFormState}
                            selectedTask={selectedTask}
                            taskBeingEdited={taskBeingEdited}
                            parentTaskForForm={parentTaskForForm}
                            onClose={() => {
                                setShowForm(false);
                                setTaskFormState(null);
                                setSelectedTask(null);
                            }}
                            renderNewProjectForm={() => (
                                <NewProjectForm
                                    onSubmit={handleProjectSubmit}
                                    onCancel={() => {
                                        setShowForm(false);
                                        setTaskFormState(null);
                                        setSelectedTask(null);
                                    }}
                                />
                            )}
                            handleTaskSubmit={handleTaskSubmit}
                            renderLibrarySearch={(onSelect) => (
                                <MasterLibrarySearch
                                    mode="copy"
                                    onSelect={onSelect}
                                    label="Search master library"
                                    placeholder="Start typing to copy an existing template task"
                                />
                            )}
                            setTaskFormState={setTaskFormState}
                            handleAddChildTask={handleAddChildTask}
                            handleEditTask={handleEditTask}
                            onDeleteTaskWrapper={onDeleteTaskWrapper}
                            fetchTasks={fetchTasks}
                        />
                    )}
                </div>

                {inviteModalProject && (
                    <InviteMemberModal
                        project={inviteModalProject}
                        onClose={() => setInviteModalProject(null)}
                        onInviteSuccess={() => {
                            setInviteModalProject(null);
                        }}
                    />
                )}
            </DashboardLayout>
        </DndContext>
    );
};

// Export wrapped component
const TaskListWithErrorBoundary = (props: Record<string, unknown>) => (
    <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => window.location.reload()}
    >
        <TaskList {...props} />
    </ErrorBoundary>
);

export default TaskListWithErrorBoundary;
