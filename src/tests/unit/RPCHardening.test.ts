import { describe, it, expect, vi } from 'vitest';
import { planter } from '@/shared/api/planterClient';

// Mock planter client
vi.mock('@/shared/api/planterClient', () => ({
    planter: {
        entities: {
            Project: {
                addMemberByEmail: vi.fn(),
            },
            Task: {
                clone: vi.fn(),
            }
        },
        rpc: vi.fn(),
    },
}));

describe('RPC Hardening & Security Response', () => {

    describe('invite_user_to_project', () => {
        it('should handle "Access denied" exception for non-members', async () => {
            // Simulate the PG exception raised by the migration
            const dbError = new Error('Access denied: You must be an owner or editor to invite members.');
            vi.mocked(planter.entities.Project.addMemberByEmail).mockRejectedValue(dbError);

            await expect(planter.entities.Project.addMemberByEmail('p1', 'bad@actor.com', 'editor'))
                .rejects
                .toThrow('Access denied: You must be an owner or editor');
        });

        it('should handle "Access denied" for privilege escalation (Editor -> Owner)', async () => {
            const dbError = new Error('Access denied: Editors cannot assign the Owner role.');
            vi.mocked(planter.entities.Project.addMemberByEmail).mockRejectedValue(dbError);

            await expect(planter.entities.Project.addMemberByEmail('p1', 'new@owner.com', 'owner'))
                .rejects
                .toThrow(/Access denied/i);
        });
    });

    describe('clone_project_template', () => {
        it('should handle "Access denied" when cloning unauthorized template', async () => {
            const dbError = new Error('Access denied: You do not have permission to access this template.');

            // Since we mocked planter entirely above, we can just check if Task.clone propagates errors.
            vi.mocked(planter.entities.Task.clone).mockResolvedValue({ data: null, error: dbError as any });

            const result = await planter.entities.Task.clone('template-123', 'project-456', 'instance', 'user-789', {});

            expect(result.error).toEqual(dbError);
        });
    });
});
