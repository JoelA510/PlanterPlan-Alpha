import { useMutation, useQueryClient } from '@tanstack/react-query'
import { planter as planterClient } from '@/shared/api/planterClient'

export function useCreateTask() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: unknown) => planterClient.entities.Task.create(data as object),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }
    })
}

export function useUpdateTask() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: { id: string, [key: string]: unknown }) => planterClient.entities.Task.update(data.id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            queryClient.invalidateQueries({ queryKey: ['task', variables.id] })
        }
    })
}

export function useDeleteTask() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: { id: string }) => planterClient.entities.Task.delete(data.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            queryClient.invalidateQueries({ queryKey: ['task'] })
        }
    })
}
