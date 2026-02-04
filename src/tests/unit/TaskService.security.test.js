import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTasksForUser } from '../../features/tasks/services/taskService';
import { planter } from '../../shared/api/planterClient';

// Mock planter
vi.mock('../../shared/api/planterClient', () => ({
    planter: {
        entities: {
            TaskWithResources: {
                filter: vi.fn(),
            },
        },
    }
}));

describe('TaskService Security', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Should return error if sortColumn contains malicious SQL', async () => {
        const maliciousSort = "id; DROP TABLE tasks;";

        // We expect this to return an error object (Service Pattern)
        const result = await getTasksForUser('user-123', { sortColumn: maliciousSort });

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.error.message).toMatch(/Invalid sort column/i);

        // Assert that planter was NOT called
        expect(planter.entities.TaskWithResources.filter).not.toHaveBeenCalled();
    });

    it('Should allow valid sort columns', async () => {
        const validSort = "created_at";
        planter.entities.TaskWithResources.filter.mockResolvedValue([]);

        await expect(getTasksForUser('user-123', { sortColumn: validSort }))
            .resolves
            .not.toThrow();

        // Assert that planter WAS called
        expect(planter.entities.TaskWithResources.filter).toHaveBeenCalledWith({ creator: 'user-123' });
    });
});
