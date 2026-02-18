
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProjectWithDefaults } from '@features/projects/services/projectService';
import { planter } from '@shared/api/planterClient';

// Mock planter client
vi.mock('@shared/api/planterClient', () => ({
    planter: {
        auth: {
            me: vi.fn(),
        },
        entities: {
            Project: {
                create: vi.fn(),
                delete: vi.fn(),
            },
        },
        rpc: vi.fn(),
    },
}));

describe('Integration: Project Creation Workflow', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const projectData = {
        title: 'Integration Test Project',
        start_date: '2026-03-01',
        creator: 'user-123',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully create a project and initialize via RPC', async () => {
        // Setup
        planter.auth.me.mockResolvedValue(mockUser);
        planter.entities.Project.create.mockResolvedValue({ id: 'proj-123', ...projectData });
        planter.rpc.mockResolvedValue({ data: { success: true }, error: null });

        // Execute
        const result = await createProjectWithDefaults(projectData);

        // Verify
        expect(planter.entities.Project.create).toHaveBeenCalledWith(expect.objectContaining({
            title: projectData.title,
            creator: mockUser.id
        }));

        // CRITICAL: Verify RPC call for initialization
        expect(planter.rpc).toHaveBeenCalledWith('initialize_default_project', {
            p_project_id: 'proj-123',
            p_creator_id: mockUser.id
        });

        expect(result).toEqual(expect.objectContaining({ id: 'proj-123' }));
    });

    it('should rollback (delete project) if RPC initialization fails', async () => {
        // Setup
        planter.auth.me.mockResolvedValue(mockUser);
        planter.entities.Project.create.mockResolvedValue({ id: 'proj-fail', ...projectData });
        // Fail the RPC
        planter.rpc.mockResolvedValue({ data: null, error: { message: 'RPC Failed' } });

        // Execute & Verify Rejection
        await expect(createProjectWithDefaults(projectData)).rejects.toThrow('Project initialization failed');

        // Verify Rollback
        expect(planter.entities.Project.delete).toHaveBeenCalledWith('proj-fail');
    });

    it('should use auth.me() if creator is not provided', async () => {
        // Setup
        planter.auth.me.mockResolvedValue(mockUser);
        planter.entities.Project.create.mockResolvedValue({ id: 'proj-auto-user', title: 'Test' });
        planter.rpc.mockResolvedValue({ data: { success: true } });

        // Execute without creator in data
        await createProjectWithDefaults({ title: 'Test' });

        // Verify
        expect(planter.auth.me).toHaveBeenCalled();
        expect(planter.entities.Project.create).toHaveBeenCalledWith(expect.objectContaining({
            creator: mockUser.id
        }));
    });
});
