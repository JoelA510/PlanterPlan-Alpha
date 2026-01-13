import { describe, it, expect } from 'vitest';
import { planter } from '@shared/api/planterClient';

describe('Debug Query', () => {
    it('should fetch tasks by root_id without 400 error', async () => {
        // Arbitrary UUID (format valid, doesn't need to exist for query syntax check)
        const testId = '00000000-0000-0000-0000-000000000000';

        try {
            const data = await planter.entities.Task.filter({ root_id: testId });

            expect(Array.isArray(data)).toBe(true);
        } catch (error) {
            console.error('Query Failed:', error);
            throw error;
        }
    });

    it('should list projects without error', async () => {
        try {
            const data = await planter.entities.Project.list();

        } catch (error) {
            console.error('Project List Failed:', error);
            throw error;
        }
    });
});
