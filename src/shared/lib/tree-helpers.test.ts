import { describe, it, expect } from 'vitest';
import {
  buildTree,
  separateTasksByOrigin,
  updateTaskInTree,
  mergeTaskUpdates,
  updateTreeExpansion,
  mergeChildrenIntoTree,
} from './tree-helpers';
import { makeTask } from '@/test-utils';
import type { TaskRow } from '@/shared/db/app.types';

// ---------------------------------------------------------------------------
// buildTree
// ---------------------------------------------------------------------------
describe('buildTree', () => {
  it('builds a flat list into a tree', () => {
    const root = makeTask({ id: 'r', parent_task_id: null, root_id: 'r', position: 1000 });
    const child1 = makeTask({ id: 'c1', parent_task_id: 'r', root_id: 'r', position: 2000 });
    const child2 = makeTask({ id: 'c2', parent_task_id: 'r', root_id: 'r', position: 1000 });
    const tree = buildTree([root, child1, child2]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('r');
    expect(tree[0].children).toHaveLength(2);
    // Sorted by position: c2 (1000) before c1 (2000)
    expect(tree[0].children![0].id).toBe('c2');
    expect(tree[0].children![1].id).toBe('c1');
  });

  it('sorts root nodes by position', () => {
    const a = makeTask({ id: 'a', parent_task_id: null, position: 3000 });
    const b = makeTask({ id: 'b', parent_task_id: null, position: 1000 });
    const tree = buildTree([a, b]);
    expect(tree[0].id).toBe('b');
    expect(tree[1].id).toBe('a');
  });

  it('handles empty array', () => {
    expect(buildTree([])).toEqual([]);
  });

  it('handles single node', () => {
    const task = makeTask({ id: 'only' });
    const tree = buildTree([task]);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toEqual([]);
  });

  it('puts orphan nodes in roots when parent not in list', () => {
    const orphan = makeTask({ id: 'o', parent_task_id: 'missing' });
    const tree = buildTree([orphan]);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('o');
  });

  it('supports deep nesting (5 levels)', () => {
    const lvl0 = makeTask({ id: 'l0', parent_task_id: null, position: 1000 });
    const lvl1 = makeTask({ id: 'l1', parent_task_id: 'l0', position: 1000 });
    const lvl2 = makeTask({ id: 'l2', parent_task_id: 'l1', position: 1000 });
    const lvl3 = makeTask({ id: 'l3', parent_task_id: 'l2', position: 1000 });
    const lvl4 = makeTask({ id: 'l4', parent_task_id: 'l3', position: 1000 });
    const tree = buildTree([lvl0, lvl1, lvl2, lvl3, lvl4]);
    expect(tree).toHaveLength(1);
    let node = tree[0];
    expect(node.id).toBe('l0');
    node = node.children![0];
    expect(node.id).toBe('l1');
    node = node.children![0];
    expect(node.id).toBe('l2');
    node = node.children![0];
    expect(node.id).toBe('l3');
    node = node.children![0];
    expect(node.id).toBe('l4');
    expect(node.children).toEqual([]);
  });

  it('filters by rootId when provided', () => {
    const root = makeTask({ id: 'r1', parent_task_id: null });
    const child = makeTask({ id: 'c1', parent_task_id: 'r1' });
    const other = makeTask({ id: 'other', parent_task_id: null });
    // With rootId filter, only tasks related to r1 should appear in roots
    const tree = buildTree([root, child, other], 'r1');
    const ids = tree.map(t => t.id);
    expect(ids).toContain('r1');
  });

  it('initializes isExpanded to false for all nodes', () => {
    const task = makeTask({ id: 'a' });
    const tree = buildTree([task]);
    expect(tree[0].isExpanded).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// separateTasksByOrigin
// ---------------------------------------------------------------------------
describe('separateTasksByOrigin', () => {
  it('separates instance and template tasks', () => {
    const tasks: TaskRow[] = [
      makeTask({ id: 'i1', origin: 'instance' }),
      makeTask({ id: 't1', origin: 'template' }),
      makeTask({ id: 'i2', origin: 'instance' }),
    ];
    const { instanceTasks, templateTasks } = separateTasksByOrigin(tasks);
    expect(instanceTasks).toHaveLength(2);
    expect(templateTasks).toHaveLength(1);
    expect(templateTasks[0].id).toBe('t1');
  });

  it('treats null origin as instance', () => {
    const tasks: TaskRow[] = [makeTask({ id: 'n', origin: null })];
    const { instanceTasks, templateTasks } = separateTasksByOrigin(tasks);
    expect(instanceTasks).toHaveLength(1);
    expect(templateTasks).toHaveLength(0);
  });

  it('handles empty array', () => {
    const { instanceTasks, templateTasks } = separateTasksByOrigin([]);
    expect(instanceTasks).toEqual([]);
    expect(templateTasks).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// updateTaskInTree
// ---------------------------------------------------------------------------
describe('updateTaskInTree', () => {
  it('updates a root node', () => {
    const tree = buildTree([makeTask({ id: 'a', title: 'old' })]);
    const result = updateTaskInTree(tree, 'a', { title: 'new' });
    expect(result[0].title).toBe('new');
  });

  it('updates a nested child', () => {
    const tasks = [
      makeTask({ id: 'p', parent_task_id: null }),
      makeTask({ id: 'c', parent_task_id: 'p', title: 'old' }),
    ];
    const tree = buildTree(tasks);
    const result = updateTaskInTree(tree, 'c', { title: 'new' });
    expect(result[0].children![0].title).toBe('new');
  });

  it('returns unchanged tree for nonexistent ID', () => {
    const tree = buildTree([makeTask({ id: 'a' })]);
    const result = updateTaskInTree(tree, 'missing', { title: 'x' });
    expect(result[0].id).toBe('a');
  });
});

// ---------------------------------------------------------------------------
// mergeTaskUpdates
// ---------------------------------------------------------------------------
describe('mergeTaskUpdates', () => {
  it('rebuilds tree from flat tasks', () => {
    const tasks: TaskRow[] = [
      makeTask({ id: 'r', parent_task_id: null }),
      makeTask({ id: 'c', parent_task_id: 'r' }),
    ];
    const result = mergeTaskUpdates(tasks);
    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// updateTreeExpansion
// ---------------------------------------------------------------------------
describe('updateTreeExpansion', () => {
  it('expands nodes in the set', () => {
    const tree = buildTree([
      makeTask({ id: 'a', parent_task_id: null }),
      makeTask({ id: 'b', parent_task_id: 'a' }),
    ]);
    const result = updateTreeExpansion(tree, new Set(['a']));
    expect(result[0].isExpanded).toBe(true);
    expect(result[0].children![0].isExpanded).toBe(false);
  });

  it('collapses all when set is empty', () => {
    const tree = buildTree([makeTask({ id: 'a' })]);
    const result = updateTreeExpansion(tree, new Set());
    expect(result[0].isExpanded).toBe(false);
  });

  it('handles deeply nested expansion', () => {
    const tasks = [
      makeTask({ id: 'l0', parent_task_id: null }),
      makeTask({ id: 'l1', parent_task_id: 'l0' }),
      makeTask({ id: 'l2', parent_task_id: 'l1' }),
    ];
    const tree = buildTree(tasks);
    const result = updateTreeExpansion(tree, new Set(['l0', 'l2']));
    expect(result[0].isExpanded).toBe(true);
    expect(result[0].children![0].isExpanded).toBe(false);
    expect(result[0].children![0].children![0].isExpanded).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mergeChildrenIntoTree
// ---------------------------------------------------------------------------
describe('mergeChildrenIntoTree', () => {
  it('replaces children at target parent', () => {
    const tree = buildTree([
      makeTask({ id: 'p', parent_task_id: null }),
      makeTask({ id: 'old-child', parent_task_id: 'p' }),
    ]);
    const newChild = { ...makeTask({ id: 'new-child', parent_task_id: 'p' }), children: [], isExpanded: false };
    const result = mergeChildrenIntoTree(tree, 'p', [newChild]);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children![0].id).toBe('new-child');
  });

  it('works with nested parent', () => {
    const tasks = [
      makeTask({ id: 'root', parent_task_id: null }),
      makeTask({ id: 'mid', parent_task_id: 'root' }),
    ];
    const tree = buildTree(tasks);
    const newChild = { ...makeTask({ id: 'deep', parent_task_id: 'mid' }), children: [], isExpanded: false };
    const result = mergeChildrenIntoTree(tree, 'mid', [newChild]);
    expect(result[0].children![0].children).toHaveLength(1);
    expect(result[0].children![0].children![0].id).toBe('deep');
  });

  it('returns unchanged tree for nonexistent parent', () => {
    const tree = buildTree([makeTask({ id: 'a' })]);
    const result = mergeChildrenIntoTree(tree, 'missing', []);
    expect(result[0].id).toBe('a');
  });
});

// ---------------------------------------------------------------------------
// Phase 5d: Edge case — null/undefined position fallback
// ---------------------------------------------------------------------------
describe('buildTree — position edge cases', () => {
  it('handles tasks with null/undefined position via ?? 0 fallback', () => {
    const tasks: TaskRow[] = [
      makeTask({ id: 'b', parent_task_id: null, position: null as unknown as number }),
      makeTask({ id: 'a', parent_task_id: null, position: undefined as unknown as number }),
      makeTask({ id: 'c', parent_task_id: null, position: 10 }),
    ];
    const result = buildTree(tasks);
    // Tasks with null/undefined position treated as 0, sorted before position=10
    expect(result).toHaveLength(3);
    expect(result[result.length - 1].id).toBe('c');
  });
});
