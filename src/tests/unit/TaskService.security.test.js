import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTasksForUser } from '../../features/tasks/services/taskService';
import { supabase } from '../../app/supabaseClient';

// Mock Supabase
vi.mock('../../app/supabaseClient', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
            })),
        })),
    }
}));

describe('TaskService Security', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Should throw Validation Error if sortColumn contains malicious SQL', async () => {
        const maliciousSort = "id; DROP TABLE tasks;";

        // We expect this to return an error object (Service Pattern)
        const result = await getTasksForUser('user-123', { sortColumn: maliciousSort });

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.error.message).toMatch(/Invalid sort column/i);

        // Assert that supabase was NOT called
        expect(supabase.from).not.toHaveBeenCalled();
    });

    it('Should allow valid sort columns', async () => {
        const validSort = "created_at";

        await expect(getTasksForUser('user-123', { sortColumn: validSort }))
            .resolves
            .not.toThrow();

        // Assert that supabase WAS called
        expect(supabase.from).toHaveBeenCalledWith('tasks_with_primary_resource');
    });
});
