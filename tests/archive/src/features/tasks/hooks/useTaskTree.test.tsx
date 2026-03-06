import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTaskTree } from './useTaskTree';

// Mock helpers from their new consolidated location
import { separateTasksByOrigin, buildTree } from '@/shared/lib/tree-helpers';

vi.mock('@/shared/lib/tree-helpers', () => ({
  separateTasksByOrigin: vi.fn(),
  buildTree: vi.fn(),
}));

describe('useTaskTree', () => {
  const mockTasks = [
    { id: 'p1', origin: 'instance' },
    { id: 't1', origin: 'template' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    separateTasksByOrigin.mockReturnValue({
      instanceTasks: [{ id: 'p1', origin: 'instance' }],
      templateTasks: [{ id: 't1', origin: 'template' }]
    });
    buildTree.mockReturnValue([]);
  });

  it('separates tasks by origin', () => {
    const { result } = renderHook(() => useTaskTree({
      tasks: mockTasks,
      hydratedProjects: {},
      activeProjectId: null,
      expandedTaskIds: new Set()
    }));

    expect(result.current.instanceTasks).toHaveLength(1);
    expect(result.current.templateTasks).toHaveLength(1);
  });

  it('identifies active project from instanceTasks', () => {
    const { result } = renderHook(() => useTaskTree({
      tasks: mockTasks,
      hydratedProjects: {},
      activeProjectId: 'p1',
      expandedTaskIds: new Set()
    }));

    expect(result.current.activeProject).toBeDefined();
    expect(result.current.activeProject?.id).toBe('p1');
  });

  it('applies expansion state purely from parameters', () => {
    buildTree.mockReturnValue([{ id: 'task-1', children: [] }]);

    const { result } = renderHook(() => useTaskTree({
      tasks: mockTasks,
      hydratedProjects: { 'p1': [{ id: 'task-1' }] } as any,
      activeProjectId: 'p1',
      expandedTaskIds: new Set(['task-1'])
    }));

    // Check memoized output properly maps `isExpanded`
    const treeChildren = result.current.activeProject?.children;
    expect(treeChildren![0].isExpanded).toBe(true);
  });
});
