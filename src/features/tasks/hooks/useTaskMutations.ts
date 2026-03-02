import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TaskInsert, TaskUpdate, TaskRow } from '@/shared/db/app.types'
import { planter as planterClient } from '@/shared/api/planterClient'

// We use TaskInsert/TaskUpdate but sometimes hooks pass custom subsets
interface TaskMutationPayload extends Partial<TaskUpdate> {
    id: string;
    root_id?: string;
}

export function useCreateTask() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: TaskInsert | TaskInsert[]) => planterClient.entities.Task.create(data),
        onSettled: (_, _error, variables) => {
            const firstVar = Array.isArray(variables) ? variables[0] : variables;
            const rootId = (firstVar as TaskInsert).root_id;
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
        mutationFn: (data: TaskMutationPayload) => planterClient.entities.Task.update(data.id, data),
        onMutate: async (updatedTask) => {
            const rootId = updatedTask.root_id;
            const targetKey = rootId ? ['projectHierarchy', rootId] : ['tasks', 'root'];

            await queryClient.cancelQueries({ queryKey: targetKey });
            await queryClient.cancelQueries({ queryKey: ['task', updatedTask.id] });

            const previousTasks = queryClient.getQueryData<TaskRow[]>(targetKey);
            const previousTaskInfo = queryClient.getQueryData<TaskRow>(['task', updatedTask.id]);

            if (previousTasks) {
                queryClient.setQueryData<TaskRow[]>(targetKey, (old) => {
                    if (!Array.isArray(old)) return old;
                    return old.map(task =>
                        task.id === updatedTask.id
                            ? { ...task, ...updatedTask } as TaskRow
                            : task
                    );
                });
            }
            if (previousTaskInfo) {
                queryClient.setQueryData<TaskRow>(['task', updatedTask.id], (old) => (old ? ({ ...old, ...updatedTask } as TaskRow) : undefined));
            }

            return { previousTasks, previousTaskInfo, rootId, updatedTaskId: updatedTask.id };
        },
        onError: (_err, _newTodo, context) => {
            const ctx = context as { previousTasks?: TaskRow[], previousTaskInfo?: TaskRow, rootId?: string, updatedTaskId: string };
            const targetKey = ctx?.rootId ? ['projectHierarchy', ctx.rootId] : ['tasks', 'root'];
            if (ctx?.previousTasks) {
                queryClient.setQueryData(targetKey, ctx.previousTasks);
            }
            if (ctx?.previousTaskInfo) {
                queryClient.setQueryData(['task', ctx.updatedTaskId], ctx.previousTaskInfo);
            }
        },
        onSettled: (_, _error, variables) => {
            const rootId = variables.root_id;
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

            const previousTasks = queryClient.getQueryData<TaskRow[]>(targetKey);

            if (previousTasks) {
                queryClient.setQueryData<TaskRow[]>(targetKey, (old) => {
                    if (!Array.isArray(old)) return old;
                    return old.filter(task => task.id !== id);
                });
            }

            return { previousTasks, rootId };
        },
        onError: (_err, _variables, context) => {
            const ctx = context as { previousTasks?: TaskRow[], rootId?: string };
            const targetKey = ctx?.rootId ? ['projectHierarchy', ctx.rootId] : ['tasks', 'root'];
            if (ctx?.previousTasks) {
                queryClient.setQueryData(targetKey, ctx.previousTasks);
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
        mutationFn: (data: { taskId: string, userId: string, root_id?: string }) => {
            if (planterClient.entities.Task.addMember) {
                return planterClient.entities.Task.addMember(data.taskId, data.userId, 'viewer');
            }
            throw new Error('Task.addMember is not defined');
        },
        onSuccess: (_, variables) => {
            const rootId = variables.root_id;
            if (rootId) {
                queryClient.invalidateQueries({ queryKey: ['projectHierarchy', rootId] })
            } else {
                queryClient.invalidateQueries({ queryKey: ['tasks', 'root'] })
            }
        }
    })
}
