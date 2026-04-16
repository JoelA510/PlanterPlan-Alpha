import { faker } from '@faker-js/faker';
import type { TaskRow, TeamMemberRow } from '@/shared/db/app.types';

/**
 * Creates a minimal TaskRow stub with sensible defaults.
 * Override any field via the `overrides` parameter.
 */
export function makeTask(overrides: Partial<TaskRow> = {}): TaskRow {
  const id = overrides.id ?? faker.string.uuid();
  return {
    id,
    title: faker.lorem.words(3),
    description: null,
    notes: null,
    purpose: null,
    actions: null,
    status: 'todo',
    origin: 'instance',
    creator: faker.string.uuid(),
    assignee_id: null,
    parent_task_id: null,
    parent_project_id: null,
    root_id: null,
    position: faker.number.int({ min: 1000, max: 100000 }),
    is_complete: false,
    is_locked: false,
    is_premium: false,
    days_from_start: null,
    start_date: null,
    due_date: null,
    location: null,
    priority: null,
    project_type: null,
    prerequisite_phase_id: null,
    primary_resource_id: null,
    settings: null,
    supervisor_email: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a Project stub (a root task with no parent).
 */
export function makeProject(overrides: Partial<TaskRow> = {}): TaskRow {
  const id = overrides.id ?? faker.string.uuid();
  return makeTask({
    id,
    parent_task_id: null,
    root_id: id,
    origin: 'instance',
    start_date: '2026-01-01',
    ...overrides,
  });
}

/**
 * Creates a flat list of tasks that form a parent→child chain.
 * Returns [root, child1, child2, ...] where each child's parent is the previous.
 */
export function makeTaskChain(depth: number, rootId?: string): TaskRow[] {
  const tasks: TaskRow[] = [];
  const rid = rootId ?? faker.string.uuid();
  let parentId: string | null = null;

  for (let i = 0; i < depth; i++) {
    const task = makeTask({
      root_id: rid,
      parent_task_id: parentId,
      position: (i + 1) * 10000,
    });
    if (i === 0) {
      task.id = rid;
      task.root_id = rid;
      task.parent_task_id = null;
    }
    tasks.push(task);
    parentId = task.id;
  }

  return tasks;
}

/**
 * Creates a flat list of sibling tasks under a single parent.
 */
export function makeSiblingTasks(
  count: number,
  parentId: string | null = null,
  rootId: string | null = null,
): TaskRow[] {
  return Array.from({ length: count }, (_, i) =>
    makeTask({
      parent_task_id: parentId,
      root_id: rootId,
      position: (i + 1) * 10000,
    }),
  );
}

/**
 * Creates a TeamMemberRow stub.
 */
export function makeTeamMember(overrides: Partial<TeamMemberRow> = {}): TeamMemberRow {
  return {
    id: faker.string.uuid(),
    project_id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    role: 'editor',
    created_at: new Date().toISOString(),
    ...overrides,
  } as TeamMemberRow;
}
