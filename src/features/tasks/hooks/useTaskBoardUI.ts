import { useState, useCallback } from 'react';
import { useToast } from '@/app/contexts/ToastContext';

interface UseTaskBoardUIProps {
    currentUserId: string | null;
    createProject: (data: any) => Promise<any>;
    createTaskOrUpdate: (data: any, state: any) => Promise<any>;
    deleteTask: (data: any) => Promise<any>;
    refreshProjectDetails: (id: string) => void;
    findTask: (id: string) => any;
    activeProjectId?: string | null;
}

export const useTaskBoardUI = ({
    currentUserId,
    createProject,
    createTaskOrUpdate,
    deleteTask,
    refreshProjectDetails,
    findTask,
    activeProjectId,
}: UseTaskBoardUIProps) => {
    const { addToast } = useToast();

    // UI State
    const [showForm, setShowForm] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [taskFormState, setTaskFormState] = useState<any>(null);
    const [inviteModalProject, setInviteModalProject] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Handlers
    const handleTaskClick = useCallback((task: any) => {
        setSelectedTask(task);
        setShowForm(false);
        setTaskFormState(null);
    }, []);

    const handleAddChildTask = useCallback((parentTask: any) => {
        setTaskFormState({
            mode: 'create',
            origin: parentTask.origin,
            parentId: parentTask.id,
        });
        setShowForm(false);
        setSelectedTask(null);
    }, []);

    const handleEditTask = useCallback((task: any) => {
        setTaskFormState({
            mode: 'edit',
            origin: task.origin,
            parentId: task.parent_task_id || null,
            taskId: task.id,
        });
        setShowForm(false);
        setSelectedTask(task);
    }, []);

    const onDeleteTaskWrapper = useCallback(
        async (task: any) => {
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
                addToast('Task deleted successfully', 'success');
            } catch (err) {
                console.error('Failed to delete task:', err);
                addToast('Failed to delete task', 'error');
            }
        },
        [deleteTask, selectedTask, taskFormState, refreshProjectDetails, addToast]
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

    const handleOpenInvite = useCallback((project: any) => {
        setInviteModalProject(project);
    }, []);

    const handleProjectSubmit = async (formData: any) => {
        setIsSaving(true);
        try {
            await createProject(formData);
            // Member assignment happens automatically in the creation RPC now.

            addToast('Project created successfully!', 'success');
            setShowForm(false);
        } catch (err) {
            console.error('Failed to create project:', err);
            addToast('Failed to create project. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTaskSubmit = async (formData: any) => {
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
