
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTasksForUser } from '../../features/tasks/services/taskService';
import { supabase } from '../../app/supabaseClient';

// Mock Supabase client
vi.mock('../../app/supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('TaskService Security', () => {
    let mockSelect, mockEq, mockOrder;

    beforeEach(() => {
        mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
        mockEq = vi.fn().mockReturnValue({ order: mockOrder });
        mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        supabase.from.mockReturnValue({ select: mockSelect });
    });

    it('should allow valid sort columns', async () => {
        await getTasksForUser('user-1', { sortColumn: 'title' });

        expect(mockOrder).toHaveBeenCalledWith('title', expect.any(Object));
    });

    it('should throw error/fail on invalid sort columns (SQL Injection attempt)', async () => {
        const maliciousSort = 'id; DROP TABLE tasks;';

        const result = await getTasksForUser('user-1', { sortColumn: maliciousSort });

        // The service catches errors and returns { data: null, error }
        // We expect the error to be our validation error
        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain('Invalid sort column');

        // Ensure Supabase was NOT called with the malicious string
        expect(mockOrder).not.toHaveBeenCalled();
    });
});
