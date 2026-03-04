import { useState, useCallback } from 'react';
import { toast } from 'sonner';

import { TaskRow, CreateProjectFormData, TaskFormData } from '@/shared/db/app.types';

export interface TaskFormState {
    mode: 'create' | 'edit';
    origin?: string;
    parentId?: string | null;
    taskId?: string;
}

interface UseTaskBoardUIProps {
    currentUserId: string | null;
    createProject: (data: CreateProjectFormData) => Promise<TaskRow>;
    createTaskOrUpdate: (data: TaskFormData, state: TaskFormState | null) => Promise<TaskRow>;
    deleteTask: (data: TaskRow) => Promise<void>;
    refreshProjectDetails: (id: string) => void;
    findTask: (id: string) => TaskRow | null;
    activeProjectId?: string | null;
}

export const useTaskBoardUI = ({
    createProject,
    createTaskOrUpdate,
    deleteTask,
    refreshProjectDetails,
    findTask,
    activeProjectId,
}: UseTaskBoardUIProps) => {
    // UI State
    const [showForm, setShowForm] = useState(false);
    const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
    const [taskFormState, setTaskFormState] = useState<TaskFormState | null>(null);
    const [inviteModalProject, setInviteModalProject] = useState<TaskRow | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Handlers
    const handleTaskClick = useCallback((task: TaskRow) => {
        setSelectedTask(task);
        setShowForm(false);
        setTaskFormState(null);
    }, []);

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
                await deleteTask(task);
                // Invalidate cache if this task belongs to one or IS one
                if (task.root_id && task.root_id !== task.id) {
                    refreshProjectDetails(task.root_id);
                }
                if (selectedTask?.id === task.id) setSelectedTask(null);
                if (taskFormState?.taskId === task.id) setTaskFormState(null);
                toast.success('Task deleted successfully');
            } catch (err) {
                console.error('Failed to delete task:', err);
                toast.error('Failed to delete task');
            }
        },
        [deleteTask, selectedTask, taskFormState, refreshProjectDetails]
    );

    const handleDeleteById = useCallback(
        (taskId: string) => {
            const task = findTask(taskId);
            if (task) {
                onDeleteTaskWrapper(task);
            }
        },
        [findTask, onDeleteTaskWrapper]
    );

    const handleOpenInvite = useCallback((project: TaskRow) => {
        setInviteModalProject(project);
    }, []);

    const handleProjectSubmit = async (formData: CreateProjectFormData) => {
        setIsSaving(true);
        try {
            await createProject(formData);
            // Member assignment happens automatically in the creation RPC now.

            toast.success('Project created successfully!');
            setShowForm(false);
        } catch (err) {
            console.error('Failed to create project:', err);
            toast.error('Failed to create project. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTaskSubmit = async (formData: TaskFormData) => {
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
            toast.success('Task saved successfully');
        } catch (err) {
            console.error('Failed to save task:', err);
            toast.error('Failed to save task. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return {
        // State
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
        handleTaskClick,
        handleAddChildTask,
        handleEditTask,
        onDeleteTaskWrapper,
        handleDeleteById,
        handleOpenInvite,
        handleProjectSubmit,
        handleTaskSubmit,
    };
};
