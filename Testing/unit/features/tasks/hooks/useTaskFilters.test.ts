import { describe, it, expect } from 'vitest';
import { filterAndSortTasks } from '@/features/tasks/hooks/useTaskFilters';
import { makeTask, makeProject } from '@test/factories';

const NOW = new Date('2026-04-16T12:00:00.000Z');

// Hierarchy:
//   project (root)
//   ├─ phase
//   │   ├─ milestone-overdue          (due 2026-04-10)
//   │   ├─ milestone-due-soon         (due 2026-04-18)
//   │   └─ milestone-current          (due 2026-05-20)
//   ├─ task-not-yet-due               (start 2026-05-01, due 2026-05-10)
//   ├─ task-completed                 (is_complete=true)
//   └─ task-priority-high             (priority='high', due 2026-05-20)
// template-root (origin='template') + template-child (should be ignored)
function buildFixture() {
 const project = makeProject({
  id: 'project',
  title: 'Z Project',
  origin: 'instance',
  settings: { due_soon_threshold: 3 },
 });
 const phase = makeTask({
  id: 'phase',
  title: 'Phase 1',
  parent_task_id: 'project',
  root_id: 'project',
  origin: 'instance',
 });
 const milestoneOverdue = makeTask({
  id: 'm-overdue',
  title: 'Alpha milestone overdue',
  parent_task_id: 'phase',
  root_id: 'project',
  origin: 'instance',
  due_date: '2026-04-10',
 });
 const milestoneDueSoon = makeTask({
  id: 'm-soon',
  title: 'Beta milestone soon',
  parent_task_id: 'phase',
  root_id: 'project',
  origin: 'instance',
  due_date: '2026-04-18',
 });
 const milestoneCurrent = makeTask({
  id: 'm-current',
  title: 'Gamma milestone current',
  parent_task_id: 'phase',
  root_id: 'project',
  origin: 'instance',
  start_date: '2026-04-01',
  due_date: '2026-05-20',
 });
 const taskNotYetDue = makeTask({
  id: 't-future',
  title: 'Delta future task',
  parent_task_id: 'project',
  root_id: 'project',
  origin: 'instance',
  start_date: '2026-05-01',
  due_date: '2026-05-10',
 });
 const taskCompleted = makeTask({
  id: 't-done',
  title: 'Epsilon done task',
  parent_task_id: 'project',
  root_id: 'project',
  origin: 'instance',
  is_complete: true,
  status: 'completed',
  due_date: '2026-03-15',
 });
 const taskPriorityHigh = makeTask({
  id: 't-high',
  title: 'Zeta priority task',
  parent_task_id: 'project',
  root_id: 'project',
  origin: 'instance',
  priority: 'high',
  due_date: '2026-05-20',
 });
 const templateRoot = makeProject({
  id: 'tpl-root',
  title: 'Template root',
  origin: 'template',
 });
 const templateChild = makeTask({
  id: 'tpl-child',
  title: 'Template child',
  parent_task_id: 'tpl-root',
  root_id: 'tpl-root',
  origin: 'template',
  due_date: '2026-04-10',
 });
 return [
  project,
  phase,
  milestoneOverdue,
  milestoneDueSoon,
  milestoneCurrent,
  taskNotYetDue,
  taskCompleted,
  taskPriorityHigh,
  templateRoot,
  templateChild,
 ];
}

describe('filterAndSortTasks — views', () => {
 it("'my_tasks' excludes roots and templates", () => {
  const tasks = buildFixture();
  const result = filterAndSortTasks({ tasks, filter: 'my_tasks', sort: 'chronological', now: NOW });
  const ids = result.map((t) => t.id).sort();
  expect(ids).toEqual(['m-current', 'm-overdue', 'm-soon', 'phase', 't-done', 't-future', 't-high'].sort());
 });

 it("'priority' keeps only priority==='high' and excludes completed", () => {
  const tasks = buildFixture();
  const result = filterAndSortTasks({ tasks, filter: 'priority', sort: 'chronological', now: NOW });
  expect(result.map((t) => t.id)).toEqual(['t-high']);
 });

 it("'overdue' keeps only urgency==='overdue'", () => {
  const tasks = buildFixture();
  const result = filterAndSortTasks({ tasks, filter: 'overdue', sort: 'chronological', now: NOW });
  expect(result.map((t) => t.id)).toEqual(['m-overdue']);
 });

 it("'due_soon' keeps tasks within the default 3-day window", () => {
  const tasks = buildFixture();
  const result = filterAndSortTasks({ tasks, filter: 'due_soon', sort: 'chronological', now: NOW });
  expect(result.map((t) => t.id)).toEqual(['m-soon']);
 });

 it("'current' keeps active tasks past start, not imminent", () => {
  const tasks = buildFixture();
  const result = filterAndSortTasks({ tasks, filter: 'current', sort: 'chronological', now: NOW });
  expect(result.map((t) => t.id).sort()).toEqual(['m-current', 't-high'].sort());
 });

 it("'not_yet_due' keeps tasks with start_date in the future", () => {
  const tasks = buildFixture();
  const result = filterAndSortTasks({ tasks, filter: 'not_yet_due', sort: 'chronological', now: NOW });
  expect(result.map((t) => t.id)).toEqual(['t-future']);
 });

 it("'completed' keeps is_complete OR status==='completed'", () => {
  const tasks = buildFixture();
  const result = filterAndSortTasks({ tasks, filter: 'completed', sort: 'chronological', now: NOW });
  expect(result.map((t) => t.id)).toEqual(['t-done']);
 });

 it("'all_tasks' returns every instance non-root task", () => {
  const tasks = buildFixture();
  const result = filterAndSortTasks({ tasks, filter: 'all_tasks', sort: 'chronological', now: NOW });
  expect(result.map((t) => t.id).sort()).toEqual(
   ['phase', 'm-overdue', 'm-soon', 'm-current', 't-future', 't-done', 't-high'].sort(),
  );
 });

 it("'milestones' returns grand-children of a root (depth 2)", () => {
  const tasks = buildFixture();
  const result = filterAndSortTasks({ tasks, filter: 'milestones', sort: 'chronological', now: NOW });
  expect(result.map((t) => t.id).sort()).toEqual(['m-current', 'm-overdue', 'm-soon'].sort());
 });
});

describe('filterAndSortTasks — sort', () => {
 it('chronological sorts ascending by due_date, nulls last', () => {
  const tasks = buildFixture();
  const result = filterAndSortTasks({ tasks, filter: 'all_tasks', sort: 'chronological', now: NOW });
  // Expected ascending by due_date: m-overdue(4/10), m-soon(4/18), t-future(5/10), m-current(5/20), t-high(5/20), t-done(3/15 but completed included), phase(null)
  // 't-done' has due 2026-03-15 which is before m-overdue
  const ids = result.map((t) => t.id);
  // phase has no due_date → last
  expect(ids[ids.length - 1]).toBe('phase');
  // first should be earliest due
  expect(ids[0]).toBe('t-done');
 });

 it('alphabetical sorts by title', () => {
  const tasks = buildFixture();
  const result = filterAndSortTasks({ tasks, filter: 'all_tasks', sort: 'alphabetical', now: NOW });
  const titles = result.map((t) => t.title);
  const sorted = [...titles].sort((a, b) => (a ?? '').localeCompare(b ?? ''));
  expect(titles).toEqual(sorted);
 });
});

describe('filterAndSortTasks — per-project threshold', () => {
 it('respects a custom due_soon_threshold from the root task settings', () => {
  const project = makeProject({
   id: 'p2',
   origin: 'instance',
   settings: { due_soon_threshold: 10 },
  });
  const child = makeTask({
   id: 'c2',
   title: 'Task',
   parent_task_id: 'p2',
   root_id: 'p2',
   origin: 'instance',
   due_date: '2026-04-25', // 9 days out — within 10-day threshold
  });
  const result = filterAndSortTasks({
   tasks: [project, child],
   filter: 'due_soon',
   sort: 'chronological',
   now: NOW,
  });
  expect(result.map((t) => t.id)).toEqual(['c2']);
 });
});
