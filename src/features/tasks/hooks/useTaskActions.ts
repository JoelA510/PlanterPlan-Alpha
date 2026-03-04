import { useCallback } from 'react';
import { supabase } from '@/shared/db/client';
import { planter } from '@/shared/api/planterClient';
import { constructCreatePayload, constructUpdatePayload } from '@/shared/lib/date-engine/payloadHelpers';
import type { TaskFormData, CurrentTask } from '@/shared/lib/date-engine/payloadHelpers';
import { toIsoDate, nowUtcIso } from '@/shared/lib/date-engine';
import type { TaskUpdate, TaskInsert } from '@/shared/db/app.types';

/** Minimal task shape used within task actions. */
interface ActionTask {
    id: string;
    parent_task_id?: string | null;
    root_id?: string | null;
    origin?: string;
    position?: number;
    status?: string;
    title?: string;
    start_date?: string | null;
    due_date?: string | null;
    [key: string]: unknown;
}

/** Form state metadata passed alongside form data. */
interface FormState {
    mode?: 'create' | 'edit';
    taskId?: string;
    origin?: string;
    parentId?: string | null;
}

/** Partial updates to apply to a task. */
type TaskUpdates = Record<string, unknown>;

interface UseTaskActionsParams {
    tasks: ActionTask[];
    fetchTasks: () => Promise<void>;
    fetchProjects?: (page?: number) => Promise<void>;
    refreshProjectDetails: (rootId: string) => Promise<void>;
    findTask: (taskId: string) => ActionTask | undefined;
    joinedProjects?: ActionTask[];
    hydratedProjects?: Record<string, ActionTask[]>;
    commitOptimisticUpdate?: (taskId: string) => void;
}

interface UseTaskActionsReturn {
    createTaskOrUpdate: (formData: Record<string, unknown>, formState: FormState) => Promise<void>;
    deleteTask: (taskOrId: ActionTask | string) => Promise<void>;
    updateTask: (taskId: string, updates: TaskUpdates) => Promise<void>;
}

export const useTaskActions = ({
    tasks,
    fetchTasks,
    fetchProjects,
    refreshProjectDetails,
    findTask,
    joinedProjects,
    hydratedProjects,
    commitOptimisticUpdate,
}: UseTaskActionsParams): UseTaskActionsReturn => {
    /* Helper to refresh the appropriate context */
    const _refreshTaskContext = useCallback(
        async (task: ActionTask | undefined) => {
            if (task) {
                const rootId =
                    task.root_id || (task.parent_task_id ? findTask(task.parent_task_id)?.root_id : null);

                if (rootId) {
                    await refreshProjectDetails(rootId);
                    return;
                }
            }
            await fetchTasks();
        },
        [findTask, refreshProjectDetails, fetchTasks]
    );

    const createTaskOrUpdate = useCallback(
        async (formData: Record<string, unknown>, formState: FormState) => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!user) throw new Error('User not authenticated');

                const origin = formState.origin || 'instance';
                const parentId = formState.parentId ?? null;
                const daysVal = formData.days_from_start as string | number | null | undefined;
                const parsedDays =
                    daysVal === '' || daysVal === null || daysVal === undefined ? null : Number(daysVal);

                if (parsedDays !== null && Number.isNaN(parsedDays))
                    throw new Error('Invalid days_from_start');

                const manualStartDate = toIsoDate(formData.start_date as string | undefined);
                const manualDueDate = toIsoDate(formData.due_date as string | undefined);
                const hasManualDates = Boolean(manualStartDate || manualDueDate);

                let contextTasks: ActionTask[] = tasks;
                let rootId: string | null = null;

                if (parentId) {
                    const parent = findTask(parentId);
                    if (parent) {
                        rootId = (parent.root_id || parent.id) as string;
                        if (rootId && hydratedProjects) {
                            contextTasks = hydratedProjects[rootId] || [];
                            const rootTask =
                                tasks.find((t) => t.id === rootId) ||
                                (joinedProjects || []).find((t) => t.id === rootId);
                            if (rootTask) contextTasks = [...contextTasks, rootTask];
                        }
                    }
                } else {
                    contextTasks = tasks;
                }

                if (formState.mode === 'edit' && formState.taskId) {
                    const currentTask = findTask(formState.taskId) || ({} as ActionTask);
                    const updates = constructUpdatePayload(
                        formData as unknown as TaskFormData,
                        currentTask as CurrentTask,
                        {
                            origin,
                            parentId: formState.parentId ?? null,
                            contextTasks,
                        },
                    );

                    await planter.entities.Task.update(
                        formState.taskId,
                        updates as TaskUpdate
                    );

                    if (rootId) await refreshProjectDetails(rootId);
                    else if (fetchProjects) await fetchProjects(1);

                    if (parentId && origin === 'instance') {
                        await planter.entities.Task.updateParentDates(parentId);
                        if (rootId) await refreshProjectDetails(rootId);
                    }
                    return;
                }

                const siblings = contextTasks.filter(
                    (task) => task.origin === origin && (task.parent_task_id || null) === parentId
                );
                const maxPosition =
                    siblings.length > 0
                        ? Math.max(...siblings.map((task) => task.position ?? 0))
                        : 0;

                const insertPayload = constructCreatePayload(formData as unknown as TaskFormData, {
                    origin,
                    parentId,
                    rootId,
                    contextTasks,
                    userId: user.id,
                    maxPosition,
                });

                if (formData.templateId) {
                    const { data: newTasks, error: cloneError } = await planter.entities.Task.clone(
                        formData.templateId as string,
                        parentId,
                        origin,
                        user.id,
                        {
                            title: formData.title as string,
                            description: formData.description as string,
                            start_date: hasManualDates ? manualStartDate : undefined,
                            due_date: hasManualDates ? (manualDueDate || manualStartDate) : undefined,
                        }
                    );
                    if (cloneError) throw cloneError;
                    if (
                        newTasks &&
                        (newTasks as Record<string, unknown>).new_root_id &&
                        parsedDays !== null
                    ) {
                        const updates: Record<string, unknown> = {
                            days_from_start: parsedDays,
                            updated_at: nowUtcIso(),
                        };
                        try {
                            await planter.entities.Task.update(
                                (newTasks as Record<string, unknown>).new_root_id as string,
                                updates as TaskUpdate
                            );
                        } catch (updateError) {
                            console.error('Error updating cloned root schedule', updateError);
                        }
                    }
                } else {
                    await planter.entities.Task.create(insertPayload as unknown as TaskInsert);
                }

                if (rootId) await refreshProjectDetails(rootId);
                else if (fetchProjects) await fetchProjects(1);

                if (parentId && origin === 'instance') {
                    await planter.entities.Task.updateParentDates(parentId);
                    if (rootId) await refreshProjectDetails(rootId);
                }
            } catch (error) {
                console.error('Error saving task:', error);
                if (commitOptimisticUpdate && formState?.taskId) {
                    commitOptimisticUpdate(formState.taskId);
                }
                throw error;
            }
        },
        [tasks, joinedProjects, hydratedProjects, fetchProjects, refreshProjectDetails, findTask, commitOptimisticUpdate]
    );

    const deleteTask = useCallback(
        async (taskOrId: ActionTask | string) => {
            try {
                const taskId = typeof taskOrId === 'object' ? taskOrId.id : taskOrId;
                const task = typeof taskOrId === 'object' ? taskOrId : findTask(taskId);
                const parentId = task ? task.parent_task_id : null;

                await planter.entities.Task.delete(taskId);

                await _refreshTaskContext(task);

                if (parentId && task && task.origin === 'instance') {
                    await planter.entities.Task.updateParentDates(parentId);
                    await _refreshTaskContext(findTask(parentId));
                }
            } catch (error) {
                console.error('Error deleting task:', error);
                if (commitOptimisticUpdate) {
                    const taskId = typeof taskOrId === 'object' ? taskOrId.id : taskOrId;
                    commitOptimisticUpdate(taskId);
                }
                throw error;
            }
        },
        [findTask, _refreshTaskContext, commitOptimisticUpdate]
    );

    const updateTask = useCallback(
        async (taskId: string, updates: TaskUpdates) => {
            try {
                const task = findTask(taskId);
                const oldParentId = task ? task.parent_task_id : null;

                await planter.entities.Task.update(taskId, updates as TaskUpdate);

                await _refreshTaskContext(task);

                if (task && task.origin === 'instance') {
                    if (updates.start_date !== undefined || updates.due_date !== undefined) {
                        if (task.parent_task_id) await planter.entities.Task.updateParentDates(task.parent_task_id);
                    }
                    if (updates.parent_task_id !== undefined && updates.parent_task_id !== oldParentId) {
                        if (oldParentId) await planter.entities.Task.updateParentDates(oldParentId);
                        if (updates.parent_task_id) await planter.entities.Task.updateParentDates(updates.parent_task_id as string);
                    }
                    await _refreshTaskContext(task);
                }
            } catch (error) {
                console.error('Error updating task:', error);
                if (commitOptimisticUpdate) {
                    commitOptimisticUpdate(taskId);
                }
                throw error;
            }
        },
        [findTask, _refreshTaskContext, commitOptimisticUpdate]
    );

    return {
        createTaskOrUpdate,
        deleteTask,
        updateTask,
    };
};
