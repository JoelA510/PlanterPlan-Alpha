import { useMemo } from 'react';
import type { TaskRow } from '@/shared/db/app.types';
import { deriveUrgency, compareDateAsc } from '@/shared/lib/date-engine/index';

export type TaskFilterKey =
 | 'my_tasks'
 | 'priority'
 | 'overdue'
 | 'due_soon'
 | 'current'
 | 'not_yet_due'
 | 'completed'
 | 'all_tasks'
 | 'milestones';

export type TaskSortKey = 'chronological' | 'alphabetical';

const DEFAULT_DUE_SOON_THRESHOLD = 3;

const isCompleted = (t: TaskRow): boolean =>
 Boolean(t.is_complete) || t.status === 'completed';

/**
 * Build a map of rootId → due_soon_threshold (in days). Root tasks store their
 * per-project threshold on `settings.due_soon_threshold`. Falls back to
 * DEFAULT_DUE_SOON_THRESHOLD for roots without the setting.
 */
const buildThresholdMap = (tasks: TaskRow[]): Map<string, number> => {
 const map = new Map<string, number>();
 for (const t of tasks) {
  if (t.parent_task_id !== null) continue;
  const settings = t.settings;
  let threshold = DEFAULT_DUE_SOON_THRESHOLD;
  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
   const raw = (settings as Record<string, unknown>).due_soon_threshold;
   if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    threshold = Math.floor(raw);
   }
  }
  map.set(t.id, threshold);
 }
 return map;
};

/**
 * Milestone convention: a task whose parent is itself a direct child of a root
 * task (i.e. grand-children of a project root, where the parent is a "phase").
 * We compute this structurally, not via a flag.
 */
const buildMilestoneIdSet = (tasks: TaskRow[]): Set<string> => {
 const roots = new Set<string>();
 for (const t of tasks) {
  if (t.parent_task_id === null) roots.add(t.id);
 }
 const phases = new Set<string>();
 for (const t of tasks) {
  if (t.parent_task_id && roots.has(t.parent_task_id)) phases.add(t.id);
 }
 const milestones = new Set<string>();
 for (const t of tasks) {
  if (t.parent_task_id && phases.has(t.parent_task_id)) milestones.add(t.id);
 }
 return milestones;
};

export interface UseTaskFiltersArgs {
 tasks: TaskRow[];
 filter: TaskFilterKey;
 sort: TaskSortKey;
 now?: Date;
}

export const filterAndSortTasks = ({
 tasks,
 filter,
 sort,
 now = new Date(),
}: UseTaskFiltersArgs): TaskRow[] => {
 const thresholds = buildThresholdMap(tasks);
 const milestoneIds = filter === 'milestones' ? buildMilestoneIdSet(tasks) : null;

 const instanceChildren = tasks.filter(
  (t) => t.parent_task_id !== null && t.origin === 'instance',
 );

 const urgencyOf = (t: TaskRow) => {
  const threshold = t.root_id ? thresholds.get(t.root_id) ?? DEFAULT_DUE_SOON_THRESHOLD : DEFAULT_DUE_SOON_THRESHOLD;
  return deriveUrgency(t, threshold, now);
 };

 let filtered: TaskRow[];
 switch (filter) {
  case 'my_tasks':
   filtered = instanceChildren;
   break;
  case 'priority':
   filtered = instanceChildren.filter((t) => t.priority === 'high' && !isCompleted(t));
   break;
  case 'overdue':
   filtered = instanceChildren.filter((t) => urgencyOf(t) === 'overdue');
   break;
  case 'due_soon':
   filtered = instanceChildren.filter((t) => urgencyOf(t) === 'due_soon');
   break;
  case 'current':
   filtered = instanceChildren.filter((t) => urgencyOf(t) === 'current');
   break;
  case 'not_yet_due':
   filtered = instanceChildren.filter((t) => urgencyOf(t) === 'not_yet_due');
   break;
  case 'completed':
   filtered = instanceChildren.filter(isCompleted);
   break;
  case 'all_tasks':
   filtered = instanceChildren;
   break;
  case 'milestones':
   filtered = instanceChildren.filter((t) => milestoneIds!.has(t.id));
   break;
  default:
   filtered = instanceChildren;
 }

 const sorted = [...filtered];
 if (sort === 'alphabetical') {
  sorted.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
 } else {
  // chronological: ascending by due_date, nulls last
  sorted.sort((a, b) => compareDateAsc(a.due_date, b.due_date));
 }
 return sorted;
};

export const useTaskFilters = (args: UseTaskFiltersArgs): TaskRow[] => {
 const { tasks, filter, sort, now } = args;
 return useMemo(
  () => filterAndSortTasks({ tasks, filter, sort, now }),
  [tasks, filter, sort, now],
 );
};

export const FILTER_LABELS: Record<TaskFilterKey, string> = {
 my_tasks: 'My Tasks',
 priority: 'Priority',
 overdue: 'Overdue',
 due_soon: 'Due Soon',
 current: 'Current',
 not_yet_due: 'Not Yet Due',
 completed: 'Completed',
 all_tasks: 'All Tasks',
 milestones: 'Milestones',
};

export const EMPTY_STATE_COPY: Record<TaskFilterKey, string> = {
 my_tasks: 'No tasks found across your projects.',
 priority: 'No high-priority tasks right now.',
 overdue: 'Nothing is overdue. Nice work.',
 due_soon: 'No tasks are due in the next few days.',
 current: 'No tasks are currently active.',
 not_yet_due: 'No upcoming tasks scheduled.',
 completed: 'No completed tasks yet.',
 all_tasks: 'No tasks in any of your projects.',
 milestones: 'No milestones found.',
};
