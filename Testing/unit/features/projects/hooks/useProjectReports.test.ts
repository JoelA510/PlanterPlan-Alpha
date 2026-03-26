import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { TaskRow } from '@/shared/db/app.types';
import { useProjectReports } from '@/features/projects/hooks/useProjectReports';

function makeTask(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: overrides.id ?? 'task-1',
    title: overrides.title ?? 'Test Task',
    description: null,
    notes: null,
    purpose: null,
    actions: null,
    status: overrides.status ?? 'todo',
    origin: 'instance',
    creator: 'user-1',
    assignee_id: null,
    parent_task_id: overrides.parent_task_id ?? null,
    parent_project_id: null,
    root_id: overrides.root_id ?? 'project-1',
    position: overrides.position ?? 10000,
    is_complete: overrides.is_complete ?? false,
    is_locked: false,
    is_premium: false,
    days_from_start: null,
    start_date: overrides.start_date ?? null,
    due_date: overrides.due_date ?? null,
    location: null,
    priority: null,
    project_type: null,
    prerequisite_phase_id: null,
    primary_resource_id: null,
    settings: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as TaskRow;
}

describe('useProjectReports', () => {
  describe('empty inputs', () => {
    it('returns zeroed stats for empty tasks and phases', () => {
      const { result } = renderHook(() => useProjectReports([], []));

      expect(result.current.totalTasks).toBe(0);
      expect(result.current.completedTasks).toBe(0);
      expect(result.current.overallProgress).toBe(0);
      expect(result.current.phaseData).toEqual([]);
      expect(result.current.milestones).toEqual([]);
      expect(result.current.taskDistribution).toEqual([
        { name: 'To Do', value: 0 },
        { name: 'In Progress', value: 0 },
        { name: 'Done', value: 0 },
      ]);
    });
  });

  describe('status counts', () => {
    it('counts completed tasks', () => {
      const tasks = [
        makeTask({ id: 't1', status: 'completed' }),
        makeTask({ id: 't2', status: 'completed' }),
        makeTask({ id: 't3', status: 'todo' }),
      ];
      const { result } = renderHook(() => useProjectReports(tasks, []));

      expect(result.current.statsConfig[0].label).toBe('Completed');
      expect(result.current.statsConfig[0].value).toBe(2);
    });

    it('counts in_progress tasks', () => {
      const tasks = [
        makeTask({ id: 't1', status: 'in_progress' }),
        makeTask({ id: 't2', status: 'in_progress' }),
        makeTask({ id: 't3', status: 'in_progress' }),
      ];
      const { result } = renderHook(() => useProjectReports(tasks, []));

      expect(result.current.statsConfig[1].label).toBe('In Progress');
      expect(result.current.statsConfig[1].value).toBe(3);
    });

    it('counts todo tasks', () => {
      const tasks = [makeTask({ id: 't1', status: 'todo' })];
      const { result } = renderHook(() => useProjectReports(tasks, []));

      expect(result.current.statsConfig[2].label).toBe('Not Started');
      expect(result.current.statsConfig[2].value).toBe(1);
    });

    it('counts blocked tasks', () => {
      const tasks = [
        makeTask({ id: 't1', status: 'blocked' }),
        makeTask({ id: 't2', status: 'blocked' }),
      ];
      const { result } = renderHook(() => useProjectReports(tasks, []));

      expect(result.current.statsConfig[3].label).toBe('Blocked');
      expect(result.current.statsConfig[3].value).toBe(2);
    });
  });

  describe('overall progress', () => {
    it('calculates progress percentage', () => {
      const tasks = [
        makeTask({ id: 't1', status: 'completed' }),
        makeTask({ id: 't2', status: 'completed' }),
        makeTask({ id: 't3', status: 'todo' }),
        makeTask({ id: 't4', status: 'in_progress' }),
      ];
      const { result } = renderHook(() => useProjectReports(tasks, []));

      expect(result.current.overallProgress).toBe(50); // 2/4 = 50%
      expect(result.current.completedTasks).toBe(2);
      expect(result.current.totalTasks).toBe(4);
    });

    it('returns 0 when no tasks exist (avoids division by zero)', () => {
      const { result } = renderHook(() => useProjectReports([], []));

      expect(result.current.overallProgress).toBe(0);
    });

    it('rounds to nearest integer', () => {
      const tasks = [
        makeTask({ id: 't1', status: 'completed' }),
        makeTask({ id: 't2', status: 'todo' }),
        makeTask({ id: 't3', status: 'todo' }),
      ];
      const { result } = renderHook(() => useProjectReports(tasks, []));

      expect(result.current.overallProgress).toBe(33); // Math.round(1/3*100) = 33
    });
  });

  describe('phaseData', () => {
    it('generates phase data with completion counts', () => {
      const phases = [makeTask({ id: 'phase-1', position: 1 })];
      const tasks = [
        makeTask({ id: 'ms-1', parent_task_id: 'phase-1', status: 'completed' }),
        makeTask({ id: 'ms-2', parent_task_id: 'phase-1', status: 'todo' }),
        makeTask({ id: 'ms-3', parent_task_id: 'phase-1', status: 'in_progress' }),
      ];

      const { result } = renderHook(() => useProjectReports(tasks, phases));

      expect(result.current.phaseData).toHaveLength(1);
      expect(result.current.phaseData[0]).toEqual(expect.objectContaining({
        completed: 1,
        remaining: 2,
        total: 3,
        progress: 33,
      }));
    });

    it('sorts phases by position', () => {
      const phases = [
        makeTask({ id: 'p2', position: 20000 }),
        makeTask({ id: 'p1', position: 10000 }),
        makeTask({ id: 'p3', position: 30000 }),
      ];

      const { result } = renderHook(() => useProjectReports([], phases));

      expect(result.current.phaseData[0].name).toContain('10000');
      expect(result.current.phaseData[1].name).toContain('20000');
      expect(result.current.phaseData[2].name).toContain('30000');
    });

    it('uses Phase N naming with position or index fallback', () => {
      const phases = [makeTask({ id: 'p1', position: 0 })];

      const { result } = renderHook(() => useProjectReports([], phases));

      // position is 0 (falsy), so falls back to idx + 1
      expect(result.current.phaseData[0].name).toBe('Phase 1');
    });

    it('includes fullName from phase title', () => {
      const phases = [makeTask({ id: 'p1', title: 'Discovery Phase', position: 1 })];

      const { result } = renderHook(() => useProjectReports([], phases));

      expect(result.current.phaseData[0].fullName).toBe('Discovery Phase');
    });
  });

  describe('milestones', () => {
    it('identifies milestones as tasks whose parent is a phase', () => {
      const phases = [makeTask({ id: 'phase-1' })];
      const tasks = [
        makeTask({ id: 'ms-1', parent_task_id: 'phase-1', due_date: '2026-06-01' }),
        makeTask({ id: 'leaf-1', parent_task_id: 'ms-1' }),
      ];

      const { result } = renderHook(() => useProjectReports(tasks, phases));

      expect(result.current.milestones).toHaveLength(1);
      expect(result.current.milestones[0].id).toBe('ms-1');
    });

    it('calculates milestone sub-task progress', () => {
      const phases = [makeTask({ id: 'phase-1' })];
      const tasks = [
        makeTask({ id: 'ms-1', parent_task_id: 'phase-1' }),
        makeTask({ id: 't1', parent_task_id: 'ms-1', status: 'completed' }),
        makeTask({ id: 't2', parent_task_id: 'ms-1', status: 'todo' }),
      ];

      const { result } = renderHook(() => useProjectReports(tasks, phases));

      expect(result.current.milestones[0]).toEqual(expect.objectContaining({
        completed: 1,
        total: 2,
        progress: 50,
      }));
    });

    it('returns progress 0 for milestones with no subtasks', () => {
      const phases = [makeTask({ id: 'phase-1' })];
      const tasks = [
        makeTask({ id: 'ms-1', parent_task_id: 'phase-1' }),
      ];

      const { result } = renderHook(() => useProjectReports(tasks, phases));

      expect(result.current.milestones[0].progress).toBe(0);
      expect(result.current.milestones[0].total).toBe(0);
    });

    it('sorts milestones by due_date with nulls last', () => {
      const phases = [makeTask({ id: 'phase-1' })];
      const tasks = [
        makeTask({ id: 'ms-1', parent_task_id: 'phase-1', due_date: null }),
        makeTask({ id: 'ms-2', parent_task_id: 'phase-1', due_date: '2026-12-01' }),
        makeTask({ id: 'ms-3', parent_task_id: 'phase-1', due_date: '2026-01-01' }),
      ];

      const { result } = renderHook(() => useProjectReports(tasks, phases));

      expect(result.current.milestones[0].id).toBe('ms-3'); // earliest
      expect(result.current.milestones[1].id).toBe('ms-2'); // later
      expect(result.current.milestones[2].id).toBe('ms-1'); // null → last
    });
  });

  describe('taskDistribution', () => {
    it('provides correct distribution array', () => {
      const tasks = [
        makeTask({ id: 't1', status: 'todo' }),
        makeTask({ id: 't2', status: 'todo' }),
        makeTask({ id: 't3', status: 'in_progress' }),
        makeTask({ id: 't4', status: 'completed' }),
        makeTask({ id: 't5', status: 'completed' }),
        makeTask({ id: 't6', status: 'completed' }),
      ];

      const { result } = renderHook(() => useProjectReports(tasks, []));

      expect(result.current.taskDistribution).toEqual([
        { name: 'To Do', value: 2 },
        { name: 'In Progress', value: 1 },
        { name: 'Done', value: 3 },
      ]);
    });
  });

  describe('statsConfig styling', () => {
    it('has correct CSS classes for each status', () => {
      const tasks = [makeTask({ id: 't1', status: 'completed' })];
      const { result } = renderHook(() => useProjectReports(tasks, []));

      const completed = result.current.statsConfig[0];
      expect(completed.borderClass).toBe('border-green-200');
      expect(completed.bgClass).toBe('bg-green-100');
      expect(completed.textClass).toBe('text-green-600');

      const inProgress = result.current.statsConfig[1];
      expect(inProgress.borderClass).toBe('border-orange-200');

      const notStarted = result.current.statsConfig[2];
      expect(notStarted.borderClass).toBe('border-indigo-200');

      const blocked = result.current.statsConfig[3];
      expect(blocked.borderClass).toBe('border-red-200');
    });
  });

  describe('mixed scenario', () => {
    it('handles realistic data with multiple phases and varied statuses', () => {
      const phases = [
        makeTask({ id: 'p1', title: 'Planning', position: 10000 }),
        makeTask({ id: 'p2', title: 'Execution', position: 20000 }),
      ];
      const tasks = [
        // Phase 1 milestones
        makeTask({ id: 'ms1', parent_task_id: 'p1', status: 'completed', due_date: '2026-03-01' }),
        makeTask({ id: 'ms2', parent_task_id: 'p1', status: 'in_progress', due_date: '2026-04-01' }),
        // Phase 2 milestones
        makeTask({ id: 'ms3', parent_task_id: 'p2', status: 'todo', due_date: '2026-06-01' }),
        // Leaf tasks under milestones
        makeTask({ id: 't1', parent_task_id: 'ms1', status: 'completed' }),
        makeTask({ id: 't2', parent_task_id: 'ms1', status: 'completed' }),
        makeTask({ id: 't3', parent_task_id: 'ms2', status: 'in_progress' }),
        makeTask({ id: 't4', parent_task_id: 'ms3', status: 'todo' }),
        makeTask({ id: 't5', parent_task_id: 'ms3', status: 'blocked' }),
      ];

      const { result } = renderHook(() => useProjectReports(tasks, phases));

      // Total: 8 tasks, 3 completed
      expect(result.current.totalTasks).toBe(8);
      expect(result.current.completedTasks).toBe(3); // ms1, t1, t2
      expect(result.current.overallProgress).toBe(38); // Math.round(3/8*100)

      // Phase data
      expect(result.current.phaseData).toHaveLength(2);
      expect(result.current.phaseData[0].fullName).toBe('Planning');
      expect(result.current.phaseData[0].completed).toBe(1); // ms1 completed
      expect(result.current.phaseData[0].total).toBe(2); // ms1, ms2

      // Milestones (children of phases)
      expect(result.current.milestones).toHaveLength(3);
      // Sorted by due_date
      expect(result.current.milestones[0].id).toBe('ms1');
      expect(result.current.milestones[1].id).toBe('ms2');
      expect(result.current.milestones[2].id).toBe('ms3');
    });
  });
});
