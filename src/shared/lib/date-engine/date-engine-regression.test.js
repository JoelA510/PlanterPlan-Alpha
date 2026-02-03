import { describe, it, expect } from 'vitest';
import { recalculateProjectDates } from './index';

describe('date-engine regression tests', () => {
    it('should not coerce null due_date to a value when shifting dates', () => {
        const tasks = [
            { id: '1', start_date: '2024-01-01', due_date: null, parent_task_id: 'root' }
        ];

        // Shift forward by 5 days
        const updates = recalculateProjectDates(tasks, '2024-01-06', '2024-01-01');

        expect(updates).toHaveLength(1);
        expect(updates[0].start_date.startsWith('2024-01-06')).toBe(true);
        expect(updates[0].due_date).toBeNull();
    });

    it('should shift due_date if it exists', () => {
        const tasks = [
            { id: '1', start_date: '2024-01-01', due_date: '2024-01-05', parent_task_id: 'root' }
        ];

        // Shift forward by 5 days
        const updates = recalculateProjectDates(tasks, '2024-01-06', '2024-01-01');

        expect(updates).toHaveLength(1);
        expect(updates[0].start_date.startsWith('2024-01-06')).toBe(true);
        expect(updates[0].due_date.startsWith('2024-01-10')).toBe(true);
    });
});
