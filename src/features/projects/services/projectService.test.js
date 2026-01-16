import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateProjectStatus } from './projectService';
import { supabase } from '@app/supabaseClient';

// Mock Supabase client
vi.mock('@app/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('projectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProjectStatus', () => {
    it('should update project status successfully', async () => {
      const projectId = 'proj-123';
      const newStatus = 'in_progress';
      const mockData = { id: projectId, status: newStatus };

      const updateBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      supabase.from.mockReturnValue(updateBuilder);

      const result = await updateProjectStatus(projectId, newStatus);

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(updateBuilder.update).toHaveBeenCalledWith({ status: newStatus });
      expect(updateBuilder.eq).toHaveBeenCalledWith('id', projectId);
      expect(result).toEqual({ data: mockData, error: null });
    });

    it('should throw error if update fails', async () => {
      const projectId = 'proj-err';
      const newStatus = 'planning';
      const mockError = { message: 'DB Error' };

      const updateBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };

      supabase.from.mockReturnValue(updateBuilder);

      await expect(updateProjectStatus(projectId, newStatus)).rejects.toEqual(mockError);
    });
  });
});
