import { useQuery } from '@tanstack/react-query'
import { planter as planterClient } from '@/shared/api/planterClient'

export function useTaskDetails(taskId: string | null) {
    const targetId = taskId ?? '00000000-0000-0000-0000-000000000000'

    return useQuery({
        queryKey: ['task', targetId],
        queryFn: () => planterClient.entities.Task.get(targetId),
        enabled: !!taskId
    })
}
