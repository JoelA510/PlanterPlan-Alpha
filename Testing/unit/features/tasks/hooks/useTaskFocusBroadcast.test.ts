import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { mockSupabaseChannel, type MockSupabaseChannel } from '@/../Testing/test-utils/mocks/supabase-channel';

let channel: MockSupabaseChannel;
const mockChannel = vi.fn();

vi.mock('@/shared/db/client', () => ({
    supabase: {
        channel: (...args: unknown[]) => mockChannel(...args),
    },
}));

vi.mock('@/shared/contexts/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'me', email: 'me@example.com' } }),
}));

import { useTaskFocusBroadcast } from '@/features/tasks/hooks/useTaskFocusBroadcast';

beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    channel = mockSupabaseChannel();
    mockChannel.mockImplementation(() => channel);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('useTaskFocusBroadcast (Wave 27)', () => {
    it('debounces 250ms before calling track() with the focused task id', () => {
        renderHook(() => useTaskFocusBroadcast('p1', 't1'));

        // Before the debounce fires, no track call.
        act(() => {
            vi.advanceTimersByTime(240);
        });
        expect(channel.track).not.toHaveBeenCalled();

        // After 250ms total, the track call fires.
        act(() => {
            vi.advanceTimersByTime(20);
        });
        expect(mockChannel).toHaveBeenCalledWith('presence:project:p1');
        expect(channel.track).toHaveBeenCalledTimes(1);
        const [payload] = channel.track.mock.calls[0] as [{ user_id: string; email: string; focusedTaskId: string | null }];
        expect(payload).toMatchObject({
            user_id: 'me',
            email: 'me@example.com',
            focusedTaskId: 't1',
        });
    });

    it('coalesces rapid focus changes into a single trailing track()', () => {
        const { rerender } = renderHook(
            ({ taskId }: { taskId: string | null }) => useTaskFocusBroadcast('p1', taskId),
            { initialProps: { taskId: 't1' as string | null } },
        );

        // Rapidly change focus inside the debounce window.
        act(() => {
            vi.advanceTimersByTime(100);
        });
        rerender({ taskId: 't2' });
        act(() => {
            vi.advanceTimersByTime(100);
        });
        rerender({ taskId: 't3' });

        // Still within the final 250ms window — no track yet.
        expect(channel.track).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(260);
        });
        expect(channel.track).toHaveBeenCalledTimes(1);
        const [payload] = channel.track.mock.calls[0] as [{ focusedTaskId: string | null }];
        expect(payload.focusedTaskId).toBe('t3');
    });

    it('cleans the pending debounce timer on unmount (no trailing track)', () => {
        const { unmount } = renderHook(() => useTaskFocusBroadcast('p1', 't1'));
        act(() => {
            vi.advanceTimersByTime(100);
        });
        unmount();
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(channel.track).not.toHaveBeenCalled();
    });

    it('is a no-op when projectId is null', () => {
        renderHook(() => useTaskFocusBroadcast(null, 't1'));
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(mockChannel).not.toHaveBeenCalled();
    });
});
