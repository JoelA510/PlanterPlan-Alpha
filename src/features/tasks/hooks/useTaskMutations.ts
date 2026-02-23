import { useMutation, useQueryClient } from '@tanstack/react-query'
import { planter as planterClient } from '@/shared/api/planterClient'

interface TaskPayload {
    id?: string;
    title?: string;
    description?: string;
    status?: string;
    root_id?: string;
    parent_task_id?: string | null;
    creator?: string;
    origin?: string;
    [key: string]: unknown;
}

export function useCreateTask() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: TaskPayload | TaskPayload[]) => planterClient.entities.Task.create(data),
        onSettled: (_, _error, variables) => {
            const firstVar = Array.isArray(variables) ? variables[0] : variables;
            const rootId = firstVar?.root_id as string | undefined;
            if (rootId) {
                queryClient.invalidateQueries({ queryKey: ['projectHierarchy', rootId] })
            } else {
                queryClient.invalidateQueries({ queryKey: ['tasks', 'root'] })
            }
        }
    })
}

export function useUpdateTask() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: TaskPayload & { id: string }) => planterClient.entities.Task.update(data.id, data),
        onMutate: async (updatedTask) => {
            const rootId = updatedTask.root_id as string | undefined;
            const targetKey = rootId ? ['projectHierarchy', rootId] : ['tasks', 'root'];

            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: targetKey });
            await queryClient.cancelQueries({ queryKey: ['task', updatedTask.id] });

            // Snapshot the previous value
            const previousTasks = queryClient.getQueryData(targetKey);
            const previousTaskInfo = queryClient.getQueryData(['task', updatedTask.id]);

            // Optimistically update to the new value
            if (previousTasks) {
                queryClient.setQueryData(targetKey, (old: any) => {
                    if (!Array.isArray(old)) return old;
                    return old.map(task =>
                        task.id === updatedTask.id
                            ? { ...task, ...updatedTask }
                            : task
                    );
                });
            }
            if (previousTaskInfo) {
                queryClient.setQueryData(['task', updatedTask.id], (old: any) => ({ ...old, ...updatedTask }));
            }

            return { previousTasks, previousTaskInfo, rootId, updatedTaskId: updatedTask.id };
        },
        onError: (_err, _newTodo, context: any) => {
            const targetKey = context?.rootId ? ['projectHierarchy', context.rootId] : ['tasks', 'root'];
            if (context?.previousTasks) {
                queryClient.setQueryData(targetKey, context.previousTasks);
            }
            if (context?.previousTaskInfo) {
                queryClient.setQueryData(['task', context.updatedTaskId], context.previousTaskInfo);
            }
        },
        onSettled: (_, _error, variables) => {
            const rootId = variables.root_id as string | undefined;
            if (rootId) {
                queryClient.invalidateQueries({ queryKey: ['projectHierarchy', rootId] })
            } else {
                queryClient.invalidateQueries({ queryKey: ['tasks', 'root'] })
            }
            queryClient.invalidateQueries({ queryKey: ['task', variables.id] })
        }
    })
}

export function useDeleteTask() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: { id: string, root_id?: string }) => planterClient.entities.Task.delete(data.id),
        onMutate: async (variables) => {
            const { id, root_id: rootId } = variables;
            const targetKey = rootId ? ['projectHierarchy', rootId] : ['tasks', 'root'];

            await queryClient.cancelQueries({ queryKey: targetKey });

            const previousTasks = queryClient.getQueryData(targetKey);

            if (previousTasks) {
                queryClient.setQueryData(targetKey, (old: any) => {
                    if (!Array.isArray(old)) return old;
                    return old.filter(task => task.id !== id);
                });
            }

            return { previousTasks, rootId };
        },
        onError: (_err, _variables, context: any) => {
            const targetKey = context?.rootId ? ['projectHierarchy', context.rootId] : ['tasks', 'root'];
            if (context?.previousTasks) {
                queryClient.setQueryData(targetKey, context.previousTasks);
            }
        },
        onSettled: (_, _error, variables) => {
            const rootId = variables.root_id;
            if (rootId) {
                queryClient.invalidateQueries({ queryKey: ['projectHierarchy', rootId] })
            } else {
                queryClient.invalidateQueries({ queryKey: ['tasks', 'root'] })
            }
            queryClient.removeQueries({ queryKey: ['task', variables.id] })
        }
    })
}

export function useAssignTaskMember() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: { taskId: string, userId: string, root_id?: string }) => (planterClient.entities.Task as any).addMember(data.taskId, data.userId, 'viewer'),
        onSuccess: (_, variables) => {
            const rootId = variables.root_id as string | undefined;
            if (rootId) {
                queryClient.invalidateQueries({ queryKey: ['projectHierarchy', rootId] })
            } else {
                queryClient.invalidateQueries({ queryKey: ['tasks', 'root'] })
            }
        }
    })
}

