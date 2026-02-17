import { describe, it, expect, vi } from 'vitest';
import { inviteMember } from './projectService';
import { planter } from '../../../shared/api/planterClient';

// Mock planter client
vi.mock('../../../shared/api/planterClient', () => ({
    planter: {
        entities: {
            Project: {
                addMember: vi.fn(),
                addMemberByEmail: vi.fn(),
            },
        },
    },
}));

import { inviteMember, inviteMemberByEmail } from './projectService';

describe('Project Service: Permissions', () => {

    it('should throw a user-friendly error when RLS denies access (42501)', async () => {
        // Mock a Postgres permission denied error
        const permissionError = new Error('Permission denied');
        permissionError.code = '42501';

        planter.entities.Project.addMember.mockRejectedValue(permissionError);

        await expect(inviteMember('p1', 'u1', 'editor'))
            .rejects
            .toThrow('Access denied: You must be an Owner to manage members.');
    });

    it('should throw a user-friendly error when RLS Policy violation (Email Invite)', async () => {
        // Mock a generic policy error
        const policyError = new Error('new row violates row-level security policy for table "project_invites"');

        planter.entities.Project.addMemberByEmail.mockRejectedValue(policyError);

        // inviteMemberByEmail in projectService.js is just a pass-through:
        // export async function inviteMemberByEmail(projectId, email, role) {
        //   return await planter.entities.Project.addMemberByEmail(projectId, email, role);
        // }
        // Wait, projectService.js does NOT wrap inviteMemberByEmail in try/catch mapping like inviteMember!
        // CHECK projectService.js again.

        // If it doesn't wrap, then this test will fail expecting the user-friendly error.
        // We should probably update projectService.js to handle this too, OR confirm if valid.
        // Let's assume we WANT consistency and update projectService.js too.

        // Now that we've standardized the service, it should throw the friendly error.
        await expect(inviteMemberByEmail('p1', 'email@test.com', 'editor'))
            .rejects
            .toThrow('Access denied: You must be an Owner to manage members.');
    });


    it('should throw a user-friendly error when RLS Policy violation is detected in message', async () => {
        // Mock a generic policy error
        const policyError = new Error('new row violates row-level security policy for table "project_members"');

        planter.entities.Project.addMember.mockRejectedValue(policyError);

        await expect(inviteMember('p1', 'u1', 'editor'))
            .rejects
            .toThrow('Access denied: You must be an Owner to manage members.');
    });

    it('should rethrow other errors unchanged', async () => {
        const otherError = new Error('Network failure');

        planter.entities.Project.addMember.mockRejectedValue(otherError);

        await expect(inviteMember('p1', 'u1', 'editor'))
            .rejects
            .toThrow('Network failure');
    });
});
