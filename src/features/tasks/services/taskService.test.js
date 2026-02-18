import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateTaskPosition } from './taskService';
import { planter } from '@/shared/api/planterClient';

// Mock planter
vi.mock('@/shared/api/planterClient', () => ({
  planter: {
    entities: {
      Task: {
        update: vi.fn(),
      },
    },
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

      planter.entities.Task.update.mockResolvedValue(mockData);

      const result = await updateTaskPosition(taskId, newPosition, parentId);

      expect(planter.entities.Task.update).toHaveBeenCalledWith(taskId, {
        position: newPosition,
        parent_task_id: parentId
      });
      expect(result.data).toEqual(mockData);
    });

    it('should handle null parentId (root items)', async () => {
      const taskId = 't2';
      const newPosition = 10000;
      const parentId = null;

      planter.entities.Task.update.mockResolvedValue({ id: taskId });

      await updateTaskPosition(taskId, newPosition, parentId);

      expect(planter.entities.Task.update).toHaveBeenCalledWith(taskId, {
        position: newPosition,
        parent_task_id: null
      });
    });
  });
});
