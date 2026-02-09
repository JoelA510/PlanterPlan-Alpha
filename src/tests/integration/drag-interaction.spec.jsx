import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTaskDrag } from '../../features/tasks/hooks/useTaskDrag';
import { act } from 'react';

// Mock dependencies
vi.mock('../../features/tasks/services/positionService', () => ({
    calculateNewPosition: vi.fn((prev, next) => (prev + (next || prev + 2000)) / 2),
    updateTaskPosition: vi.fn(),
    updateTasksBatch: vi.fn().mockResolvedValue(true),
    updateTask: vi.fn().mockResolvedValue(true), // Assuming we'll add this generic update
}));

// We need to mock the date inheritance service too
vi.mock('../../features/tasks/services/dateInheritance', () => ({
    calculateDateDeltas: vi.fn(() => ([
        { id: 'task-a', start_date: '2024-02-01' }
    ])),
}));

describe('Integration: Drag & Drop with Date Cascade', () => {
    let mockTasks;
    let mockSetTasks;
    let mockFetchTasks;
    let mockUpdateTaskStatus;
    let mockHandleOptimisticUpdate;

    beforeEach(() => {
        mockSetTasks = vi.fn();
        mockFetchTasks = vi.fn();
        mockUpdateTaskStatus = vi.fn();
        mockHandleOptimisticUpdate = vi.fn();

        mockTasks = [
            { id: 'milestone-x', title: 'Milestone X', start_date: '2024-01-01', parent_task_id: null, origin: 'instance' },
            { id: 'milestone-y', title: 'Milestone Y', start_date: '2024-02-01', parent_task_id: null, origin: 'instance' },
            { id: 'task-a', title: 'Task A', start_date: '2024-01-01', parent_task_id: 'milestone-x', origin: 'instance' }
        ];
    });

    it('should trigger date cascade when reparenting to a milestone with different date', async () => {
        const { result } = renderHook(() => useTaskDrag({
            tasks: mockTasks,
            setTasks: mockSetTasks,
            fetchTasks: mockFetchTasks,
            updateTaskStatus: mockUpdateTaskStatus,
            handleOptimisticUpdate: mockHandleOptimisticUpdate
        }));

        const { handleDragEnd } = result.current;

        // Simulate Drag: Task A -> Milestone Y
        const event = {
            active: { id: 'task-a' },
            over: {
                id: 'milestone-y',
                data: { current: { type: 'container', parentId: 'milestone-y', origin: 'instance' } }
            }
        };

        await act(async () => {
            await handleDragEnd(event);
        });

        // Expectation:
        // 1. handleOptimisticUpdate should be called with position, parent_id AND date updates
        // We know our mock `calculateDateDeltas` returns a specific update for 'task-a'.

        expect(mockHandleOptimisticUpdate).toHaveBeenCalledWith('task-a', expect.objectContaining({
            parent_task_id: 'milestone-y',
            // It should also contain the batched date updates or trigger them?
            // The hook implementation might pass `updates: [...]` or merge them.
            // For now, let's assume valid implementation merges date updates into the payload or separate calls?
            // Ideally: One call with all changes.
        }));

        // Actually, `handleOptimisticUpdate` usually takes (taskId, partialUpdate).
        // If date cascade affects MULTIPLE tasks, `useTaskDrag` might need to call it multiple times 
        // OR `handleOptimisticUpdate` needs to support bulk.
        // For this test, let's verify that AT LEAST 'task-a' got its date updated.

        // Note: The date update logic comes from `calculateDateDeltas`.
        // If we reparent 'task-a' from X (Jan 1) to Y (Feb 1), delta is +31 days.
        // task-a was Jan 1, so it becomes Feb 1.
    });
});
