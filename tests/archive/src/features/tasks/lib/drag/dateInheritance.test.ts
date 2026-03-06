import { describe, it, expect } from 'vitest';
import { getDescendants, calculateDateDeltas, DateInheritanceTask } from './dateInheritance';

describe('dateInheritance', () => {
  describe('getDescendants', () => {
    it('returns an empty array if there are no descendants', () => {
      const allTasks: DateInheritanceTask[] = [{ id: '1' }, { id: '2' }];
      expect(getDescendants(allTasks, '1')).toEqual([]);
    });

    it('returns direct descendants', () => {
      const allTasks: DateInheritanceTask[] = [
        { id: '1' },
        { id: '2', parent_task_id: '1' },
        { id: '3', parent_task_id: '1' },
      ];
      const descendants = getDescendants(allTasks, '1');
      expect(descendants).toHaveLength(2);
      expect(descendants.map((d) => d.id)).toEqual(expect.arrayContaining(['2', '3']));
    });

    it('returns nested descendants', () => {
      const allTasks: DateInheritanceTask[] = [
        { id: '1' },
        { id: '2', parent_task_id: '1' },
        { id: '3', parent_task_id: '2' },
        { id: '4', parent_task_id: '3' },
        { id: '5' },
      ];
      const descendants = getDescendants(allTasks, '1');
      expect(descendants).toHaveLength(3);
      expect(descendants.map((d) => d.id)).toEqual(expect.arrayContaining(['2', '3', '4']));
    });
  });

  describe('calculateDateDeltas', () => {
    it('returns empty array if oldDate or newDate are missing', () => {
      const allTasks: DateInheritanceTask[] = [];
      expect(calculateDateDeltas(allTasks, '1', null, '2023-01-01')).toEqual([]);
      expect(calculateDateDeltas(allTasks, '1', '2023-01-01', undefined)).toEqual([]);
    });

    it('returns empty array if diffDays is 0', () => {
      const allTasks: DateInheritanceTask[] = [{ id: '2', parent_task_id: '1', start_date: '2023-01-10' }];
      expect(calculateDateDeltas(allTasks, '1', '2023-01-01', '2023-01-01')).toEqual([]);
    });

    it('returns empty array if dates are invalid', () => {
       const allTasks: DateInheritanceTask[] = [{ id: '2', parent_task_id: '1', start_date: '2023-01-10' }];
       expect(calculateDateDeltas(allTasks, '1', 'invalid', '2024-01-01')).toEqual([]);
       expect(calculateDateDeltas(allTasks, '1', '2024-01-01', 'invalid')).toEqual([]);
    });

    it('correctly shifts dates of descendants', () => {
      const allTasks: DateInheritanceTask[] = [
        { id: '1', start_date: '2023-01-01' },
        { id: '2', parent_task_id: '1', start_date: '2023-01-10' },
        { id: '3', parent_task_id: '2', start_date: '2023-01-15' },
        { id: '4', parent_task_id: '1' }, // No start date
      ];
      
      // Shift root from Jan 1 to Jan 5 (+4 days)
      const updates = calculateDateDeltas(allTasks, '1', '2023-01-01', '2023-01-05');
      
      expect(updates).toHaveLength(2);
      expect(updates).toContainEqual({ id: '2', start_date: '2023-01-14' });
      expect(updates).toContainEqual({ id: '3', start_date: '2023-01-19' });
    });

    it('handles Date objects as well as strings', () => {
      const allTasks: DateInheritanceTask[] = [
        { id: '2', parent_task_id: '1', start_date: new Date(2023, 0, 10) as any },
      ];
      
      // Shift root from Jan 1 to Jan 3 (+2 days)
      const updates = calculateDateDeltas(allTasks, '1', new Date(2023, 0, 1), new Date(2023, 0, 3));
      
      expect(updates).toHaveLength(1);
      expect(updates).toContainEqual({ id: '2', start_date: '2023-01-12' });
    });

    it('ignores descendants with invalid start dates', () => {
      const allTasks: DateInheritanceTask[] = [
        { id: '2', parent_task_id: '1', start_date: 'invalid-date' },
      ];
      const updates = calculateDateDeltas(allTasks, '1', '2023-01-01', '2023-01-03');
      expect(updates).toHaveLength(0);
    });
  });
});
