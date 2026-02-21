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
        onSuccess: (_, variables) => {
            const rootId = variables.root_id as string | undefined;
            if (rootId) {
                queryClient.invalidateQueries({ queryKey: ['tasks', 'tree', rootId] })
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
        onSuccess: (_, variables) => {
            const rootId = variables.root_id as string | undefined;
            if (rootId) {
                queryClient.invalidateQueries({ queryKey: ['tasks', 'tree', rootId] })
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
        onSuccess: (_, variables) => {
            const rootId = variables.root_id;
            if (rootId) {
                queryClient.invalidateQueries({ queryKey: ['tasks', 'tree', rootId] })
            } else {
                queryClient.invalidateQueries({ queryKey: ['tasks', 'root'] })
            }
            queryClient.removeQueries({ queryKey: ['task', variables.id] })
        }
    })
}
