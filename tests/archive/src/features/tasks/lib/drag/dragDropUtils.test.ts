import { describe, it, expect } from 'vitest';
import { calculateDropTarget, DragTask } from './dragDropUtils';

describe('dragDropUtils', () => {
  describe('calculateDropTarget', () => {
    it('returns invalid if active task is not found', () => {
      expect(calculateDropTarget([], { id: '1' }, { id: '2' }, 'board')).toEqual({ isValid: false });
    });

    it('returns invalid if over element is not a task and not a valid container', () => {
      // Over without data.current.type = 'container' and not in allTasks
      const allTasks: DragTask[] = [{ id: '1' }];
      expect(calculateDropTarget(allTasks, { id: '1' }, { id: '2' }, 'board').isValid).toBe(false);
    });

    it('rejects dropping a parent into its own child (circular dependency)', () => {
      const allTasks: DragTask[] = [
        { id: '1' },
        { id: '2', parent_task_id: '1' },
        { id: '3', parent_task_id: '2' }
      ];
      // Dragging '1' into '3'
      const active = { id: '1' };
      const over = { id: '3' };
      const result = calculateDropTarget(allTasks, active, over, undefined);
      expect(result.isValid).toBe(false);
    });

    it('rejects drops across different origins', () => {
      const allTasks: DragTask[] = [
        { id: '1', origin: 'originA' },
        { id: '2', origin: 'originB' },
      ];
      const result = calculateDropTarget(allTasks, { id: '1' }, { id: '2' }, 'originA');
      expect(result.isValid).toBe(false);
    });

    it('handles container drops (empty container)', () => {
      const allTasks: DragTask[] = [
        { id: '1', origin: 'board', parent_task_id: 'root' }
      ];
      const active = { id: '1' };
      const over = {
        id: 'container-col1',
        data: { current: { type: 'container', origin: 'board', parentId: 'col1' } }
      };
      
      const result = calculateDropTarget(allTasks, active, over, 'board');
      expect(result.isValid).toBe(true);
      expect(result.newParentId).toBe('col1');
      expect(result.newPos).toBeGreaterThan(0); // Appended at beginning
    });

    it('handles container drops (appends at end of siblings)', () => {
      const allTasks: DragTask[] = [
        { id: '1', origin: 'board', parent_task_id: 'col1' },
        { id: '2', origin: 'board', parent_task_id: 'col1', position: 1000 },
        { id: '3', origin: 'board', parent_task_id: 'col1', position: 2000 }
      ];
      const active = { id: '1' }; // Moves from col1 start to col1 end
      const over = {
        id: 'container-col1',
        data: { current: { type: 'container', origin: 'board', parentId: 'col1' } }
      };

      const result = calculateDropTarget(allTasks, active, over, 'board');
      expect(result.isValid).toBe(true);
      expect(result.newParentId).toBe('col1');
      expect(result.newPos).toBeGreaterThan(2000); // positionService uses prevPos + 2*STEP
    });

    it('handles container drops from a different column', () => {
      const allTasks: DragTask[] = [
        { id: '1', origin: 'board', parent_task_id: 'col1' },
        { id: '2', origin: 'board', parent_task_id: 'col2', position: 1000 }
      ];
      const active = { id: '1' }; // From col1
      const over = {
        id: 'container-col2',
        data: { current: { type: 'container', origin: 'board', parentId: 'col2' } }
      };

      const result = calculateDropTarget(allTasks, active, over, 'board');
      expect(result.isValid).toBe(true);
      expect(result.newParentId).toBe('col2');
      expect(result.newPos).toBeGreaterThan(1000);
    });

    it('handles moving a task down (activeIndex < overIndex)', () => {
      const allTasks: DragTask[] = [
        { id: '1', origin: 'board', position: 1000 },
        { id: '2', origin: 'board', position: 2000 },
        { id: '3', origin: 'board', position: 3000 }
      ];
      const active = { id: '1' }; // Originally pos 1000
      const over = { id: '2' };   // Dropped on pos 2000

      const result = calculateDropTarget(allTasks, active, over, 'board');
      expect(result.isValid).toBe(true);
      expect(result.newParentId).toBe(null);
      // Moving down means the new position should be between overIndex and overIndex + 1
      // between 2000 and 3000 => 2500
      expect(result.newPos).toBe(2500);
    });

    it('handles moving a task up (activeIndex > overIndex)', () => {
      const allTasks: DragTask[] = [
        { id: '1', origin: 'board', position: 1000 },
        { id: '2', origin: 'board', position: 2000 },
        { id: '3', origin: 'board', position: 3000 }
      ];
      const active = { id: '3' }; // Originally pos 3000
      const over = { id: '2' };   // Dropped on pos 2000

      const result = calculateDropTarget(allTasks, active, over, 'board');
      expect(result.isValid).toBe(true);
      expect(result.newParentId).toBe(null);
      // Moving up means the new position should be between overIndex - 1 and overIndex
      // between 1000 and 2000 => 1500
      expect(result.newPos).toBe(1500);
    });

    it('handles dropping a task that was not in siblings (activeIndex = -1)', () => {
      const allTasks: DragTask[] = [
        { id: '1', origin: 'board', parent_task_id: 'col1', position: 1000 },
        { id: '2', origin: 'board', parent_task_id: 'col2', position: 2000 },
        { id: '3', origin: 'board', parent_task_id: 'col2', position: 3000 }
      ];
      const active = { id: '1' }; // From col1
      const over = { id: '2' };   // To col2, dropping on id 2

      const result = calculateDropTarget(allTasks, active, over, 'board');
      expect(result.isValid).toBe(true);
      expect(result.newParentId).toBe('col2');
      // activeIndex is -1. So it acts as moving up (inserts before overIndex)
      // overIndex is 0 (id 2 is the first in col2). So prev = undefined, next = id 2.
      // between 0 and 2000 => 1000
      expect(result.newPos).toBe(1000);
    });
  });
});
