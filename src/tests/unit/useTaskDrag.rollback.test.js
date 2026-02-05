import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskDrag } from '../../features/tasks/hooks/useTaskDrag';
import { PointerSensor, KeyboardSensor } from '@dnd-kit/core';

// Mock dependencies
vi.mock('@dnd-kit/core', () => ({
    useSensor: vi.fn(),
    useSensors: vi.fn(),
    PointerSensor: 'PointerSensor',
    KeyboardSensor: 'KeyboardSensor',
}));

vi.mock('@features/tasks/services/positionService', () => ({
    calculateNewPosition: vi.fn(),
    renormalizePositions: vi.fn(),
    updateTaskPosition: vi.fn(),
}));

describe('useTaskDrag Rollback', () => {
    let mockSetTasks;
    let mockFetchTasks;
    let mockUpdateTaskStatus;
    let mockHandleOptimisticUpdate;
    let mockCommitOptimisticUpdate;

    const mockTasks = [
        { id: 'task-1', status: 'todo', origin: 'instance', position: 100 },
        { id: 'task-2', status: 'in-progress', origin: 'instance', position: 200 }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockSetTasks = vi.fn();
        mockFetchTasks = vi.fn();
        mockUpdateTaskStatus = vi.fn();
        mockHandleOptimisticUpdate = vi.fn();
        mockCommitOptimisticUpdate = vi.fn();
    });

    it('calls commitOptimisticUpdate (revert) when status update fails', async () => {
        const { result } = renderHook(() => useTaskDrag({
            tasks: mockTasks,
            setTasks: mockSetTasks,
            fetchTasks: mockFetchTasks,
            currentUserId: 'user-1',
            updateTaskStatus: mockUpdateTaskStatus,
            handleOptimisticUpdate: mockHandleOptimisticUpdate,
            commitOptimisticUpdate: mockCommitOptimisticUpdate // Pass the missing prop in test
        }));

        // Simulate Drag End Event (Status Change)
        const event = {
            active: { id: 'task-1' },
            over: {
                id: 'col-done',
                data: { current: { status: 'done', isColumn: true } }
            }
        };

        // Make update fail
        mockUpdateTaskStatus.mockRejectedValue(new Error('Network Error'));

        await act(async () => {
            await result.current.handleDragEnd(event);
        });

        // 1. Check Optimistic Update was called initially
        expect(mockHandleOptimisticUpdate).toHaveBeenCalledWith('task-1', { status: 'done' });

        // 2. Check Service call was made
        expect(mockUpdateTaskStatus).toHaveBeenCalledWith('task-1', 'done');

        // 3. FAIL CONDITION: Should call commitOptimisticUpdate to clear the dirty state
        // Currently code calls handleOptimisticUpdate again with old status, which is "wrong"
        expect(mockCommitOptimisticUpdate).toHaveBeenCalledWith('task-1');
    });
});
