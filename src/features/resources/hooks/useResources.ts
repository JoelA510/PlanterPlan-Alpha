import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { planter as planterClient } from '@/shared/api/planterClient'

export function useTaskResources(taskId: string | null) {
    const targetId = taskId ?? '00000000-0000-0000-0000-000000000000'

    return useQuery({
        queryKey: ['resources', targetId],
        queryFn: () => planterClient.entities.TaskResource.list(),
        enabled: !!taskId
    })
}

export function useAddResource() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: unknown) => planterClient.entities.TaskResource.create(data as object),
        onSuccess: (_, variables) => {
            const taskId = Array.isArray(variables) ? variables[0]?.task_id : (variables as Record<string, unknown>)?.task_id;
            if (taskId) queryClient.invalidateQueries({ queryKey: ['resources', taskId] })
        }
    })
}

export function useDeleteResource() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => planterClient.entities.TaskResource.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['resources'] })
        }
    })
}
