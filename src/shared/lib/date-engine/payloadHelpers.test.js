import { describe, it, expect, vi } from 'vitest';
import { constructCreatePayload, constructUpdatePayload } from './payloadHelpers';
import * as dateEngine from './index';

// Mock date engine to control outputs
vi.mock('./index', async () => {
    const actual = await vi.importActual('./index');
    return {
        ...actual,
        calculateScheduleFromOffset: vi.fn(),
        toIsoDate: vi.fn((val) => val), // Simple pass-through for easier testing
    };
});

describe('payloadHelpers', () => {
    const mockContext = {
        origin: 'instance',
        parentId: 'parent-123',
        rootId: 'root-456',
        contextTasks: [],
        userId: 'user-789',
        maxPosition: 100,
    };

    const mockFormData = {
        title: 'New Task',
        description: 'Desc',
        days_from_start: '5',
        start_date: null,
        due_date: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('constructCreatePayload', () => {
        it('constructs basic payload correctly', () => {
            const payload = constructCreatePayload(mockFormData, mockContext);

            expect(payload).toMatchObject({
                title: 'New Task',
                description: 'Desc',
                days_from_start: 5,
                origin: 'instance',
                creator: 'user-789',
                parent_task_id: 'parent-123',
                root_id: 'root-456',
                is_complete: false,
            });
            // Position should be max + step (assuming step is imported, check logic)
            expect(payload.position).toBeGreaterThan(100);
        });

        it('calculates schedule if days_from_start is provided for instance', () => {
            dateEngine.calculateScheduleFromOffset.mockReturnValue({
                start_date: '2023-01-06',
                due_date: '2023-01-06',
            });

            const payload = constructCreatePayload(mockFormData, mockContext);

            expect(dateEngine.calculateScheduleFromOffset).toHaveBeenCalledWith(
                mockContext.contextTasks,
                mockContext.parentId,
                5
            );
            expect(payload.start_date).toBe('2023-01-06');
        });

        it('prioritizes manual dates over calculated ones', () => {
            const manualData = { ...mockFormData, start_date: '2023-02-01' };
            dateEngine.calculateScheduleFromOffset.mockReturnValue({
                start_date: '2023-01-06',
                due_date: '2023-01-06',
            });

            const payload = constructCreatePayload(manualData, mockContext);

            expect(payload.start_date).toBe('2023-02-01');
            // Should default due_date to start_date if not provided
            expect(payload.due_date).toBe('2023-02-01');
        });
    });

    describe('constructUpdatePayload', () => {
        it('constructs update payload correctly', () => {
            const payload = constructUpdatePayload(mockFormData, {}, mockContext);

            expect(payload).toMatchObject({
                title: 'New Task',
                description: 'Desc',
                days_from_start: 5,
            });
            expect(payload.updated_at).toBeDefined();
        });

        it('handles manual date overrides in updates', () => {
            const manualData = { ...mockFormData, start_date: '2023-03-01', due_date: '2023-03-05' };
            dateEngine.calculateScheduleFromOffset.mockReturnValue({
                start_date: '2023-01-06',
                due_date: '2023-01-06'
            });

            const payload = constructUpdatePayload(manualData, {}, mockContext);

            expect(payload.start_date).toBe('2023-03-01');
            expect(payload.due_date).toBe('2023-03-05');
        });
    });
});
