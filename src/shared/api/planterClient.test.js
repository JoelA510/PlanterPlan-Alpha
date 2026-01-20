import { describe, it, expect, vi, beforeEach } from 'vitest';
import planter from './planterClient';
import { supabase } from '@app/supabaseClient';

// Mock Supabase client
vi.mock('@app/supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
        auth: {
            getUser: vi.fn(),
            signOut: vi.fn()
        },
        rpc: vi.fn()
    }
}));

describe('planterClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('entities.Project.list', () => {
        it('should filter for instance projects (root tasks)', async () => {
            const mockSelect = vi.fn().mockReturnThis();
            const mockIs = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

            supabase.from.mockReturnValue({
                select: mockSelect,
                is: mockIs,
                eq: mockEq,
                order: mockOrder
            });

            await planter.entities.Project.list();

            expect(supabase.from).toHaveBeenCalledWith('tasks');
            expect(mockIs).toHaveBeenCalledWith('parent_task_id', null);
            expect(mockEq).toHaveBeenCalledWith('origin', 'instance');
        });
    });

    describe('entities.Task.create', () => {
        it('should insert payload into tasks table', async () => {
            const mockInsert = vi.fn().mockReturnThis();
            const mockSelect = vi.fn().mockReturnThis();
            const mockSingle = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null });

            supabase.from.mockReturnValue({
                insert: mockInsert,
                select: mockSelect,
                single: mockSingle
            });

            const payload = { title: 'New Task' };
            const result = await planter.entities.Task.create(payload);

            expect(result).toEqual({ id: '1' });
            expect(mockInsert).toHaveBeenCalledWith([payload]);
        });
    });
});
