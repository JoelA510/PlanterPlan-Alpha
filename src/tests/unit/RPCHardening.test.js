
import { describe, it, expect, vi } from 'vitest';
import { planter } from '../../shared/api/planterClient';
import { inviteMemberByEmail } from '../../features/projects/services/projectService';
import { deepCloneTask } from '../../features/tasks/services/taskCloneService';

// Mock planter client
vi.mock('../../shared/api/planterClient', () => ({
    planter: {
        entities: {
            Project: {
                addMemberByEmail: vi.fn(),
            },
        },
        rpc: vi.fn(),
    },
}));

describe('RPC Hardening & Security Response', () => {

    describe('invite_user_to_project', () => {
        it('should handle "Access denied" exception for non-members', async () => {
            // Simulate the PG exception raised by the migration
            const dbError = new Error('Access denied: You must be an owner or editor to invite members.');
            planter.entities.Project.addMemberByEmail.mockRejectedValue(dbError);

            await expect(inviteMemberByEmail('p1', 'bad@actor.com', 'editor'))
                .rejects
                .toThrow('Access denied: You must be an owner or editor'); // Matches the actual error passed through
        });

        it('should handle "Access denied" for privilege escalation (Editor -> Owner)', async () => {
            const dbError = new Error('Access denied: Editors cannot assign the Owner role.');
            planter.entities.Project.addMemberByEmail.mockRejectedValue(dbError);

            await expect(inviteMemberByEmail('p1', 'new@owner.com', 'owner'))
                .rejects
                .toThrow(/Access denied/i);
        });
    });

    describe('clone_project_template', () => {
        it('should handle "Access denied" when cloning unauthorized template', async () => {
            const dbError = new Error('Access denied: You do not have permission to access this template.');

            // Mock the client object passed to deepCloneTask
            const mockClient = {
                rpc: vi.fn().mockResolvedValue({ data: null, error: dbError })
            };

            // Using the mock client injection capability of the service
            const result = await deepCloneTask('template-123', 'project-456', 'instance', 'user-789', {}, mockClient);

            expect(result.error).toEqual(dbError);
        });
    });
});
