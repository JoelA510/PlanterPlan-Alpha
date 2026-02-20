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
        mutationFn: (data: any) => planterClient.entities.TaskResource.create(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['resources', variables.task_id] })
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
