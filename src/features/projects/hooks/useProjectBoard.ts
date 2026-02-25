import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TASK_STATUS } from '@/app/constants/index';
import {
    useCreateTask,
    useUpdateTask,
    useDeleteTask,
    useAssignTaskMember
} from '@/features/tasks/hooks/useTaskMutations';

import type { TaskRow, PersonRow } from '@/shared/db/app.types';

export function useProjectBoard(projectId: string | undefined, tasks: TaskRow[] = []) {
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('board');
    const [selectedPhase, setSelectedPhase] = useState<TaskRow | null>(null);
    const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
    const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
    const [inlineAddingParentId, setInlineAddingParentId] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);

    const _updateTask = useUpdateTask();
    const _deleteTask = useDeleteTask();
    const _assignMember = useAssignTaskMember();
    const _createTask = useCreateTask();

    const handleTaskUpdate = (taskId: string, data: any) => {
        _updateTask.mutate({ id: taskId, ...data, root_id: projectId }, {
            onError: (error: Error) => {
                toast.error('Failed to update task', { description: error.message });
            }
        });
    };

    const handleTaskClick = (task: TaskRow) => setSelectedTask(task);

    const handleToggleExpand = (task: TaskRow, isExpanded: boolean) => {
        setExpandedTaskIds((prev) => {
            const newSet = new Set(prev);
            if (isExpanded) newSet.add(task.id);
            else newSet.delete(task.id);
            return newSet;
        });
    };

    const mapTaskWithState = (task: TaskRow): any => ({
        ...task,
        isExpanded: expandedTaskIds.has(task.id) || inlineAddingParentId === task.id,
        isAddingInline: inlineAddingParentId === task.id,
        children: tasks
            .filter((t) => t.parent_task_id === task.id)
            .map(mapTaskWithState)
            .sort((a, b) => (a.position || 0) - (b.position || 0)),
    });

    const handleStartInlineAdd = (parentTask: TaskRow) => {
        setInlineAddingParentId(parentTask.id);
        setExpandedTaskIds((prev) => new Set(prev).add(parentTask.id));
    };

    const handleInlineCommit = async (parentId: string, title: string) => {
        try {
            await _createTask.mutateAsync({
                title,
                root_id: projectId,
                status: 'todo',
                parent_task_id: parentId,
                origin: 'instance',
                priority: 'medium',
                description: '',
            });
            setInlineAddingParentId(null);
        } catch (e) {
            toast.error('Failed to create task');
        }
    };

    const handleDeleteTask = (t: TaskRow) => {
        if (window.confirm(`Delete "${t.title || 'this task'}"? This cannot be undone.`)) {
            _deleteTask.mutate({ id: t.id, root_id: projectId }, {
                onSuccess: () => {
                    setSelectedTask(null);
                    toast.success('Task deleted');
                },
                onError: (error: Error) => toast.error('Failed to delete task', { description: error.message })
            });
        }
    };

    return {
        state: {
            activeTab, selectedPhase, selectedTask, showInviteModal, inlineAddingParentId
        },
        actions: {
            setActiveTab, setSelectedPhase, setSelectedTask, setShowInviteModal, setInlineAddingParentId
        },
        handlers: {
            handleTaskUpdate, handleTaskClick, handleToggleExpand,
            handleStartInlineAdd, handleInlineCommit, handleDeleteTask
        },
        computed: {
            mapTaskWithState
        }
    };
}
