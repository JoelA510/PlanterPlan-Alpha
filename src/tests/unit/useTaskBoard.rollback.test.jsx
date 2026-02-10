import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskDrag } from '../../features/task-drag/model/useTaskDrag';
import { useTaskMutations } from '../../features/tasks/hooks/useTaskMutations';

// Mocks
vi.mock('@dnd-kit/core', () => ({
    useSensor: vi.fn(),
    useSensors: vi.fn().mockReturnValue([]),
    PointerSensor: vi.fn(),
    KeyboardSensor: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
    sortableKeyboardCoordinates: vi.fn(),
}));

vi.mock('../../features/task-drag/lib/positionService', () => ({
    updateTasksBatch: vi.fn(),
}));

vi.mock('../../features/task-drag/lib/dragDropUtils', () => ({
    calculateDropTarget: vi.fn(),
}));

vi.mock('../../features/task-drag/lib/dateInheritance', () => ({
    calculateDateDeltas: vi.fn(),
}));

vi.mock('@shared/ui/use-toast', () => ({
    toast: vi.fn(),
}));

// Mocks for useTaskMutations
vi.mock('@app/supabaseClient', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
        },
    },
}));

vi.mock('@shared/api/planterClient', () => ({
    planter: {
        entities: {
            Task: {
                update: vi.fn(),
                create: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

vi.mock('../../features/tasks/services/taskService', () => ({
    deepCloneTask: vi.fn(),
    updateParentDates: vi.fn(),
}));

vi.mock('@shared/lib/date-engine', () => ({
    calculateScheduleFromOffset: vi.fn(),
    toIsoDate: vi.fn(),
}));


import { updateTasksBatch } from '../../features/task-drag/lib/positionService';
import { calculateDropTarget } from '../../features/task-drag/lib/dragDropUtils';
import { planter } from '@shared/api/planterClient';

describe('useTaskDrag Rollback', () => {
    let mockSetTasks;
    let mockFetchTasks;
    let mockUpdateTaskStatus;
    let mockHandleOptimisticUpdate;
    let mockCommitOptimisticUpdate;

    const mockTasks = [
        { id: '1', title: 'Task 1', status: 'todo', origin: 'instance' },
        { id: '2', title: 'Task 2', status: 'in-progress', origin: 'instance' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockSetTasks = vi.fn();
        mockFetchTasks = vi.fn();
        mockUpdateTaskStatus = vi.fn();
        mockHandleOptimisticUpdate = vi.fn();
        mockCommitOptimisticUpdate = vi.fn();
    });

    it('should call commitOptimisticUpdate when drag operation fails', async () => {
        // Setup mocks for a valid move
        calculateDropTarget.mockReturnValue({ isValid: true, newPos: 100, newParentId: null });
        updateTasksBatch.mockRejectedValue(new Error('API Error')); // Simulate failure

        const { result } = renderHook(() => useTaskDrag({
            tasks: mockTasks,
            setTasks: mockSetTasks,
            fetchTasks: mockFetchTasks,
            updateTaskStatus: mockUpdateTaskStatus,
            handleOptimisticUpdate: mockHandleOptimisticUpdate,
            commitOptimisticUpdate: mockCommitOptimisticUpdate,
        }));

        const event = {
            active: { id: '1', data: { current: mockTasks[0] } },
            over: { id: '2', data: { current: mockTasks[1] } },
        };

        // Act
        await act(async () => {
            await result.current.handleDragEnd(event);
        });

        // Assert
        expect(mockCommitOptimisticUpdate).toHaveBeenCalledWith('1');
        expect(mockFetchTasks).toHaveBeenCalled();
        expect(result.current.moveError).toBe('Failed to move task. Reverting changes...');
    });
});

describe('useTaskMutations Rollback', () => {
    let mockFetchTasks;
    let mockFindTask;
    let mockCommitOptimisticUpdate;
    let mockRefreshProjectDetails;

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetchTasks = vi.fn();
        mockFindTask = vi.fn().mockReturnValue({ id: '1' });
        mockCommitOptimisticUpdate = vi.fn();
        mockRefreshProjectDetails = vi.fn();
    });

    it('should call commitOptimisticUpdate when updateTask fails', async () => {
        // Mock failure
        planter.entities.Task.update.mockResolvedValue({ error: new Error('Update Failed') });

        const { result } = renderHook(() => useTaskMutations({
            tasks: [],
            fetchTasks: mockFetchTasks,
            findTask: mockFindTask,
            refreshProjectDetails: mockRefreshProjectDetails,
            commitOptimisticUpdate: mockCommitOptimisticUpdate,
        }));

        // Act & Assert
        await expect(result.current.updateTask('1', { title: 'New Title' }))
            .rejects.toThrow('Update Failed');

        expect(mockCommitOptimisticUpdate).toHaveBeenCalledWith('1');
    });
});
