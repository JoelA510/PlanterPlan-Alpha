import { useQuery } from '@tanstack/react-query';
import { planter } from '@/shared/api/planterClient';
import type { Task } from '@/shared/db/app.types';

/**
 * Fetches sibling tasks (same parent_task_id) for a given task.
 * Returns [] for project roots and when taskId is missing.
 */
export function useTaskSiblings(taskId: string | null | undefined, parentTaskId: string | null | undefined) {
    const enabled = !!taskId && !!parentTaskId;
    return useQuery<Task[]>({
        queryKey: ['taskSiblings', taskId],
        queryFn: () => planter.entities.Task.listSiblings(taskId as string),
        enabled,
        staleTime: 1000 * 30,
    });
}
