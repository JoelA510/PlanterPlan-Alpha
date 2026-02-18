import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateProjectStatus } from './projectService';
import { planter } from '@/shared/api/planterClient';

// Mock planter client
vi.mock('@/shared/api/planterClient', () => ({
  planter: {
    entities: {
      Project: {
        update: vi.fn(),
      },
    },
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
      const mockProject = { id: projectId, status: newStatus };

      planter.entities.Project.update.mockResolvedValue(mockProject);

      const result = await updateProjectStatus(projectId, newStatus);

      expect(planter.entities.Project.update).toHaveBeenCalledWith(projectId, { status: newStatus });
      expect(result).toEqual({ data: mockProject, error: null });
    });

    it('should throw error if update fails', async () => {
      const projectId = 'proj-err';
      const newStatus = 'planning';
      const mockError = new Error('DB Error');

      planter.entities.Project.update.mockRejectedValue(mockError);

      await expect(updateProjectStatus(projectId, newStatus)).rejects.toThrow('DB Error');
    });
  });
});
