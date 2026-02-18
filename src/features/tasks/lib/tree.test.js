import { describe, it, expect } from 'vitest';
import { buildTree } from '../../../shared/lib/treeHelpers';
import { createMockTask } from '../../../shared/test/factories';

describe('Tree Logic: buildTree', () => {

    it('should handle an empty list', () => {
        const tree = buildTree([], 'root-id');
        expect(tree).toEqual([]);
    });

    it('should build a flat list of direct children', () => {
        const rootId = 'root-id';
        const task1 = createMockTask({ id: 't1', parent_task_id: rootId, position: 1 });
        const task2 = createMockTask({ id: 't2', parent_task_id: rootId, position: 2 });

        const tree = buildTree([task1, task2], rootId);

        expect(tree).toHaveLength(2);
        expect(tree[0].id).toBe('t1');
        expect(tree[1].id).toBe('t2');
        expect(tree[0].children).toEqual([]);
    });

    it('should build a nested hierarchy (Deep Tree)', () => {
        const rootId = 'root-id';

        // Level 1
        const l1 = createMockTask({ id: 'l1', parent_task_id: rootId });
        // Level 2
        const l2 = createMockTask({ id: 'l2', parent_task_id: 'l1' });
        // Level 3
        const l3 = createMockTask({ id: 'l3', parent_task_id: 'l2' });

        const input = [l1, l2, l3];
        const tree = buildTree(input, rootId);

        expect(tree).toHaveLength(1);
        expect(tree[0].id).toBe('l1');
        expect(tree[0].children).toHaveLength(1);
        expect(tree[0].children[0].id).toBe('l2');
        expect(tree[0].children[0].children).toHaveLength(1);
        expect(tree[0].children[0].children[0].id).toBe('l3');
    });

    it('should handle orphaned nodes gracefully (exclude them)', () => {
        const rootId = 'root-id';
        const validChild = createMockTask({ id: 'valid', parent_task_id: rootId });
        const orphan = createMockTask({ id: 'orphan', parent_task_id: 'missing-parent' });

        const tree = buildTree([validChild, orphan], rootId);

        // Orphan should not be in the root array
        expect(tree).toHaveLength(1);
        expect(tree[0].id).toBe('valid');

        // And generally buildTree implementations either discard orphans or put them somewhere. 
        // Based on typical implementation, they are just not linked if parent isn't found in map or is not root.
        // The current implementation in treeHelpers checks:
        // if (item.parent_task_id === parentId) -> push to roots
        // else if (map.has(item.parent_task_id)) -> push to parent's children
        // So orphans (parent not in items and parent != rootId) are correctly ignored.
    });

    it('should respect position sorting', () => {
        const rootId = 'root-id';
        const t1 = createMockTask({ id: 't1', parent_task_id: rootId, position: 200 });
        const t2 = createMockTask({ id: 't2', parent_task_id: rootId, position: 100 });

        const tree = buildTree([t1, t2], rootId);

        expect(tree[0].id).toBe('t2'); // 100
        expect(tree[1].id).toBe('t1'); // 200
    });
});
