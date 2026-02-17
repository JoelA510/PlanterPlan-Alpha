import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepCloneTask } from './taskCloneService';

describe('taskCloneService: deepCloneTask', () => {
    let mockClient;

    beforeEach(() => {
        mockClient = {
            rpc: vi.fn(),
        };
    });

    it('should call clone_project_template RPC with correct parameters', async () => {
        // Mock success
        mockClient.rpc.mockResolvedValue({ data: { new_root_id: 'new-root' }, error: null });

        const params = {
            templateId: 'tmpl-1',
            newParentId: 'parent-1',
            newOrigin: 'instance',
            userId: 'user-1',
        };

        const result = await deepCloneTask(
            params.templateId,
            params.newParentId,
            params.newOrigin,
            params.userId,
            {}, // no overrides
            mockClient
        );

        expect(mockClient.rpc).toHaveBeenCalledWith('clone_project_template', {
            p_template_id: 'tmpl-1',
            p_new_parent_id: 'parent-1',
            p_new_origin: 'instance',
            p_user_id: 'user-1',
        });
        expect(result.data).toEqual({ new_root_id: 'new-root' });
    });

    it('should include overrides in RPC params when provided', async () => {
        mockClient.rpc.mockResolvedValue({ data: {}, error: null });

        const overrides = {
            title: 'New Title',
            start_date: '2026-01-01',
        };

        await deepCloneTask(
            'tmpl-1',
            null,
            'instance',
            'user-1',
            overrides,
            mockClient
        );

        expect(mockClient.rpc).toHaveBeenCalledWith('clone_project_template', {
            p_template_id: 'tmpl-1',
            p_new_parent_id: null,
            p_new_origin: 'instance',
            p_user_id: 'user-1',
            p_title: 'New Title',
            p_start_date: '2026-01-01',
        });
    });

    it('should omit undefined overrides', async () => {
        mockClient.rpc.mockResolvedValue({ data: {}, error: null });

        const overrides = {
            title: undefined,
            description: 'Desc',
        };

        await deepCloneTask(
            'tmpl-1',
            null,
            'instance',
            'user-1',
            overrides,
            mockClient
        );

        expect(mockClient.rpc).toHaveBeenCalledWith('clone_project_template', expect.objectContaining({
            p_description: 'Desc'
        }));

        // Should NOT have p_title
        const callArgs = mockClient.rpc.mock.calls[0][1];
        expect(callArgs).not.toHaveProperty('p_title');
    });

    it('should return error if RPC fails', async () => {
        const mockError = new Error('RPC Failed');
        mockClient.rpc.mockResolvedValue({ data: null, error: mockError });

        // Assuming implementation catches and returns { data: null, error }
        // Or console.errors. The implementation:
        // if (error) throw error;
        // catch (error) { return { data: null, error }; }

        const result = await deepCloneTask(
            'tmpl-1',
            null,
            'instance',
            'user-1',
            {},
            mockClient
        );

        expect(result.error).toBe(mockError);
    });
});
