import { useQuery } from '@tanstack/react-query';
import { planter } from '@/shared/api/planterClient';
import type { ResourceWithTask } from '@/shared/db/app.types';

/**
 * Fetches all task resources belonging to a project (all tasks whose root_id = projectId).
 * Returns the full ResourceWithTask[] so the caller can filter/search client-side.
 */
export function useProjectResources(projectId: string | undefined) {
    return useQuery<ResourceWithTask[]>({
        queryKey: ['projectResources', projectId],
        queryFn: ({ signal }) =>
            planter.entities.TaskResource.listByProject(projectId!, { signal }),
        enabled: !!projectId,
        staleTime: 60_000,
    });
}
