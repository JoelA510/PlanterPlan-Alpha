import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTaskDragAndDrop } from './useTaskDragAndDrop';

// Mock dependencies
vi.mock('@/features/task-drag', () => ({
    useTaskDrag: vi.fn(() => ({
        sensors: ['sensor-1'],
        handleDragEnd: 'handle-drag-end-fn'
    })),
}));

describe('useTaskDragAndDrop', () => {
    it('flattens tasks + hydratedProjects for passed tasks', () => {
        const { result } = renderHook(() => useTaskDragAndDrop({
            tasks: [{ id: 'p1' }],
            hydratedProjects: { 'p1': [{ id: 't1' }] },
            setTasks: vi.fn(),
            fetchTasks: vi.fn(),
            currentUserId: 'u1',
            updateTask: vi.fn(),
            handleOptimisticUpdate: vi.fn(),
            commitOptimisticUpdate: vi.fn(),
        }));

        // Check that it derived allTasks correctly
        expect(result.current.allTasks).toHaveLength(2);
        expect(result.current.allTasks.map(t => t.id)).toEqual(['p1', 't1']);

        // Check that it returns what useTaskDrag returns
        expect(result.current.sensors).toEqual(['sensor-1']);
        expect(result.current.handleDragEnd).toBe('handle-drag-end-fn');
    });
});
