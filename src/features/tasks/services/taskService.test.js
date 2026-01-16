import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateTaskPosition } from './taskService';
import { supabase } from '@app/supabaseClient';

// Mock Supabase
vi.mock('@app/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('taskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateTaskPosition', () => {
    it('should update task position and parent_task_id correctly', async () => {
      const taskId = 't1';
      const newPosition = 50000;
      const parentId = 'p1';
      const mockData = { id: taskId, position: newPosition, parent_task_id: parentId };

      const updateBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null })
      };

      supabase.from.mockReturnValue(updateBuilder);

      const result = await updateTaskPosition(taskId, newPosition, parentId);

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(updateBuilder.update).toHaveBeenCalledWith({
        position: newPosition,
        parent_task_id: parentId
      });
      expect(updateBuilder.eq).toHaveBeenCalledWith('id', taskId);
      expect(result.data).toEqual(mockData);
    });

    it('should handle null parentId (root items)', async () => {
      const taskId = 't2';
      const newPosition = 10000;
      const parentId = null;

      const updateBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: taskId }, error: null })
      };

      supabase.from.mockReturnValue(updateBuilder);

      await updateTaskPosition(taskId, newPosition, parentId);

      expect(updateBuilder.update).toHaveBeenCalledWith({
        position: newPosition,
        parent_task_id: null
      });
    });
  });
});
