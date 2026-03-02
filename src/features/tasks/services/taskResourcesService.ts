import planter from '@/shared/api/planterClient';
import type { Database } from '@/shared/db/database.types';

type ResourceType = Database['public']['Enums']['task_resource_type'];

export const listTaskResources = async (taskId: string) => {
    return planter.entities.TaskResource.filter({ task_id: taskId });
};

export const createTaskResource = async (
    taskId: string,
    payload: {
        type: ResourceType;
        url?: string;
        text_content?: string;
        storage_path?: string;
    }
) => {
    return planter.entities.TaskResource.create({
        task_id: taskId,
        resource_type: payload.type,
        resource_url: payload.url || null,
        resource_text: payload.text_content || null,
        storage_path: payload.storage_path || null,
        storage_bucket: null, // Default
    });
};

export const deleteTaskResource = async (id: string) => {
    return planter.entities.TaskResource.delete(id);
};

export const setPrimaryResource = async (taskId: string, resourceId: string | null) => {
    return planter.entities.TaskResource.setPrimary(taskId, resourceId);
};
