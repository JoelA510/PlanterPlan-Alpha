import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskTree } from './useTaskTree';

// Mock helpers if complex, but they are pure functions, so we can rely on real logic or simple mocks if separateTasksByOrigin is complex.
// Since separateTasksByOrigin is imported, let's mock it to control inputs.
import { separateTasksByOrigin } from '@shared/lib/viewHelpers';
import { buildTree } from '@shared/lib/treeHelpers';

vi.mock('@shared/lib/viewHelpers', () => ({
    separateTasksByOrigin: vi.fn(),
}));

vi.mock('@shared/lib/treeHelpers', () => ({
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
            activeProjectId: null
        }));

        expect(result.current.instanceTasks).toHaveLength(1);
        expect(result.current.templateTasks).toHaveLength(1);
    });

    it('identifies active project from instanceTasks', () => {
        const { result } = renderHook(() => useTaskTree({
            tasks: mockTasks,
            hydratedProjects: {},
            activeProjectId: 'p1'
        }));

        expect(result.current.activeProject).toBeDefined();
        expect(result.current.activeProject.id).toBe('p1');
    });

    it('manages expansion state', () => {
        const { result } = renderHook(() => useTaskTree({
            tasks: mockTasks,
            hydratedProjects: {},
            activeProjectId: 'p1'
        }));

        expect(result.current.expandedTaskIds.has('task-1')).toBe(false);

        act(() => {
            result.current.handleToggleExpand({ id: 'task-1' }, true);
        });

        expect(result.current.expandedTaskIds.has('task-1')).toBe(true);

        act(() => {
            result.current.handleToggleExpand({ id: 'task-1' }, false);
        });

        expect(result.current.expandedTaskIds.has('task-1')).toBe(false);
    });
});
