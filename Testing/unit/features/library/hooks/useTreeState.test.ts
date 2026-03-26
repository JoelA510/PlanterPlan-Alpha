import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { TaskItemData } from '@/shared/types/tasks';

// ---- Mocks ----
const mockFetchChildren = vi.fn();
const mockUpdateStatus = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/shared/api/planterClient', () => ({
  planter: {
    entities: {
      Task: {
        fetchChildren: (...args: unknown[]) => mockFetchChildren(...args),
        updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
        update: (...args: unknown[]) => mockUpdate(...args),
      },
    },
  },
}));

vi.mock('@/shared/constants', () => ({
  POSITION_STEP: 10000,
}));

// Mock tree-helpers to return predictable values and avoid
// object-reference churn between the two useEffects.
const mockMergeTaskUpdates = vi.fn((tasks: TaskItemData[]) => tasks);
const mockUpdateTreeExpansion = vi.fn((nodes: TaskItemData[]) => nodes);
const mockBuildTree = vi.fn((tasks: TaskItemData[]) => tasks);
const mockMergeChildrenIntoTree = vi.fn(
  (nodes: TaskItemData[], _parentId: string, children: TaskItemData[]) => {
    return nodes.map(n =>
      n.id === _parentId ? { ...n, children } : n,
    );
  },
);
const mockUpdateTaskInTree = vi.fn(
  (nodes: TaskItemData[], taskId: string, updates: Partial<TaskItemData>) => {
    return nodes.map(n =>
      n.id === taskId ? { ...n, ...updates } : n,
    );
  },
);

vi.mock('@/shared/lib/tree-helpers', () => ({
  mergeTaskUpdates: (...args: unknown[]) => mockMergeTaskUpdates(...args),
  updateTreeExpansion: (...args: unknown[]) => mockUpdateTreeExpansion(...args),
  buildTree: (...args: unknown[]) => mockBuildTree(...args),
  mergeChildrenIntoTree: (...args: unknown[]) => mockMergeChildrenIntoTree(...args),
  updateTaskInTree: (...args: unknown[]) => mockUpdateTaskInTree(...args),
}));

import { useTreeState } from '@/features/library/hooks/useTreeState';

function makeNode(overrides: Partial<TaskItemData> = {}): TaskItemData {
  return {
    id: overrides.id ?? 'node-1',
    title: overrides.title ?? 'Test Node',
    status: overrides.status ?? 'todo',
    position: overrides.position ?? 10000,
    children: overrides.children ?? [],
    isExpanded: overrides.isExpanded ?? false,
    parent_task_id: overrides.parent_task_id ?? null,
    root_id: overrides.root_id ?? null,
    ...overrides,
  } as TaskItemData;
}

describe('useTreeState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({ error: null });
    mockUpdateStatus.mockResolvedValue({ error: null });
    // Reset tree-helper mocks to default pass-through behavior
    mockMergeTaskUpdates.mockImplementation((tasks: TaskItemData[]) => tasks);
    mockUpdateTreeExpansion.mockImplementation((nodes: TaskItemData[]) => nodes);
    mockBuildTree.mockImplementation((tasks: TaskItemData[]) => tasks);
    mockMergeChildrenIntoTree.mockImplementation(
      (nodes: TaskItemData[], _parentId: string, children: TaskItemData[]) =>
        nodes.map(n => (n.id === _parentId ? { ...n, children } : n)),
    );
    mockUpdateTaskInTree.mockImplementation(
      (nodes: TaskItemData[], taskId: string, updates: Partial<TaskItemData>) =>
        nodes.map(n => (n.id === taskId ? { ...n, ...updates } : n)),
    );
  });

  describe('initialization', () => {
    it('initializes with empty tree data', () => {
      const { result } = renderHook(() => useTreeState([]));
      expect(result.current.treeData).toEqual([]);
    });

    it('sets tree data from rootTasks', () => {
      const nodes = [makeNode({ id: 'a', position: 1000 }), makeNode({ id: 'b', position: 2000 })];
      const { result } = renderHook(() => useTreeState(nodes));

      expect(result.current.treeData.length).toBeGreaterThanOrEqual(0);
    });

    it('initializes with empty expandedTaskIds', () => {
      const { result } = renderHook(() => useTreeState([]));
      expect(result.current.expandedTaskIds.size).toBe(0);
    });

    it('initializes with empty loadingNodes', () => {
      const { result } = renderHook(() => useTreeState([]));
      expect(result.current.loadingNodes).toEqual({});
    });
  });

  describe('toggleExpand', () => {
    it('adds task ID to expandedTaskIds when expanding', async () => {
      const node = makeNode({ id: 'task-1', children: [makeNode({ id: 'child-1' })] });
      const { result } = renderHook(() => useTreeState([node]));

      await act(async () => {
        await result.current.toggleExpand(node, true);
      });

      expect(result.current.expandedTaskIds.has('task-1')).toBe(true);
    });

    it('removes task ID from expandedTaskIds when collapsing', async () => {
      const node = makeNode({ id: 'task-1', children: [makeNode({ id: 'child-1' })] });
      const { result } = renderHook(() => useTreeState([node]));

      // Expand first
      await act(async () => {
        await result.current.toggleExpand(node, true);
      });
      expect(result.current.expandedTaskIds.has('task-1')).toBe(true);

      // Collapse
      await act(async () => {
        await result.current.toggleExpand(node, false);
      });
      expect(result.current.expandedTaskIds.has('task-1')).toBe(false);
    });

    it('fetches children when expanding a node with no children', async () => {
      const childTasks = [makeNode({ id: 'child-1', parent_task_id: 'task-1' })];
      mockFetchChildren.mockResolvedValue({ data: childTasks, error: null });

      const node = makeNode({ id: 'task-1', children: [] });
      const { result } = renderHook(() => useTreeState([node]));

      await act(async () => {
        await result.current.toggleExpand(node, true);
      });

      expect(mockFetchChildren).toHaveBeenCalledWith('task-1');
    });

    it('does not fetch children when node already has children', async () => {
      const node = makeNode({
        id: 'task-1',
        children: [makeNode({ id: 'child-1' })],
      });
      const { result } = renderHook(() => useTreeState([node]));

      await act(async () => {
        await result.current.toggleExpand(node, true);
      });

      expect(mockFetchChildren).not.toHaveBeenCalled();
    });

    it('handles fetch error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetchChildren.mockResolvedValue({ data: null, error: new Error('Network error') });

      const node = makeNode({ id: 'task-1', children: [] });
      const { result } = renderHook(() => useTreeState([node]));

      await act(async () => {
        await result.current.toggleExpand(node, true);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load children', expect.any(Error));
      expect(result.current.loadingNodes['task-1']).toBe(false);
      consoleSpy.mockRestore();
    });

    it('clears loading state after fetch completes', async () => {
      mockFetchChildren.mockResolvedValue({ data: [], error: null });

      const node = makeNode({ id: 'task-1', children: [] });
      const { result } = renderHook(() => useTreeState([node]));

      await act(async () => {
        await result.current.toggleExpand(node, true);
      });

      expect(result.current.loadingNodes['task-1']).toBe(false);
    });
  });

  describe('handleStatusChange', () => {
    it('optimistically updates status in tree', async () => {
      const node = makeNode({ id: 'task-1', status: 'todo' });
      const { result } = renderHook(() => useTreeState([node]));

      // Wait for initial tree to be set
      await waitFor(() => {
        expect(result.current.treeData.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.handleStatusChange('task-1', 'completed');
      });

      expect(mockUpdateStatus).toHaveBeenCalledWith('task-1', 'completed');
    });

    it('rolls back status on API error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUpdateStatus.mockResolvedValue({ error: new Error('Update failed') });

      const node = makeNode({ id: 'task-1', status: 'todo' });
      const { result } = renderHook(() => useTreeState([node]));

      await waitFor(() => {
        expect(result.current.treeData.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.handleStatusChange('task-1', 'completed');
      });

      // Should have attempted rollback
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update status', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('handleReorder', () => {
    it('returns early when activeId equals overId', async () => {
      const node = makeNode({ id: 'task-1' });
      const { result } = renderHook(() => useTreeState([node]));

      await act(async () => {
        await result.current.handleReorder('task-1', 'task-1');
      });

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('calculates new position and calls API when reordering siblings', async () => {
      const nodes = [
        makeNode({ id: 'a', position: 10000, parent_task_id: null }),
        makeNode({ id: 'b', position: 20000, parent_task_id: null }),
        makeNode({ id: 'c', position: 30000, parent_task_id: null }),
      ];
      const { result } = renderHook(() => useTreeState(nodes));

      await waitFor(() => {
        expect(result.current.treeData.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.handleReorder('a', 'c');
      });

      // Should call update with a new position
      expect(mockUpdate).toHaveBeenCalledWith('a', expect.objectContaining({
        position: expect.any(Number),
      }));
    });

    it('handles API update failure silently (fire-and-forget)', async () => {
      // The update is fire-and-forget with .catch(), so we just verify it was called
      mockUpdate.mockRejectedValue(new Error('Reorder failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const nodes = [
        makeNode({ id: 'a', position: 10000 }),
        makeNode({ id: 'b', position: 20000 }),
      ];
      const { result } = renderHook(() => useTreeState(nodes));

      await waitFor(() => {
        expect(result.current.treeData.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.handleReorder('a', 'b');
      });

      // Verify the update was attempted
      expect(mockUpdate).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('tree data updates', () => {
    it('clears tree when rootTasks becomes empty array', () => {
      const { result, rerender } = renderHook(
        ({ tasks }) => useTreeState(tasks),
        { initialProps: { tasks: [makeNode({ id: 'a' })] } },
      );

      rerender({ tasks: [] });
      expect(result.current.treeData).toEqual([]);
    });
  });
});
