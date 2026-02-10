import { describe, it, expect } from 'vitest';
import { calculateDateDeltas, getDescendants } from '../../features/task-drag/lib/dateInheritance';
import { addDays, parseISO, format } from 'date-fns';

describe('Date Inheritance Service', () => {
    // Helper to create a task
    const t = (id, parentId, startDate) => ({
        id,
        parent_task_id: parentId,
        start_date: startDate,
        children: [] // Optional for flat list processing, but good for tree structure if needed
    });

    describe('getDescendants', () => {
        it('should return all descendants of a node in a flat list', () => {
            const tasks = [
                t('root', null, '2024-01-01'),
                t('child1', 'root', '2024-01-05'),
                t('child2', 'root', '2024-01-06'),
                t('grandchild1', 'child1', '2024-01-10'),
                t('unrelated', null, '2024-02-01')
            ];

            const result = getDescendants(tasks, 'root');
            const ids = result.map(t => t.id).sort();

            expect(ids).toEqual(['child1', 'child2', 'grandchild1']);
        });
    });

    describe('calculateDateDeltas', () => {
        it('should shift descendants by the same delta', () => {
            const tasks = [
                t('root', null, '2024-01-01'),
                t('child1', 'root', '2024-01-05'), // +4 days from root
                t('grandchild1', 'child1', '2024-01-10') // +5 days from child1
            ];

            // Move root +5 days -> 2024-01-06
            const updates = calculateDateDeltas(
                tasks,
                'root',
                '2024-01-01', // Old Date
                '2024-01-06'  // New Date
            );

            // Expect child1: Jan 5 + 5 days = Jan 10
            // Expect grandchild1: Jan 10 + 5 days = Jan 15

            const childUpdate = updates.find(u => u.id === 'child1');
            const grandUpdate = updates.find(u => u.id === 'grandchild1');

            expect(childUpdate).toBeDefined();
            expect(childUpdate.start_date).toBe('2024-01-10'); // ISO format usually check

            expect(grandUpdate).toBeDefined();
            expect(grandUpdate.start_date).toBe('2024-01-15');
        });

        it('should ignore descendants with NO start_date (null)', () => {
            const tasks = [
                t('root', null, '2024-01-01'),
                t('child1', 'root', null)
            ];

            const updates = calculateDateDeltas(tasks, 'root', '2024-01-01', '2024-01-06');

            // Should NOT update child1 as it has no baseline to shift from
            expect(updates).toHaveLength(0);
        });

        it('should handle complex shifting (backwards)', () => {
            const tasks = [
                t('root', null, '2024-01-10'),
                t('child1', 'root', '2024-01-15')
            ];

            // Move root BACK 5 days -> 2024-01-05
            const updates = calculateDateDeltas(tasks, 'root', '2024-01-10', '2024-01-05');

            const childUpdate = updates.find(u => u.id === 'child1');
            expect(childUpdate.start_date).toBe('2024-01-10'); // 15 - 5
        });
    });
});
