import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockSupabaseChannel, type MockSupabaseChannel } from '@/../Testing/test-utils/mocks/supabase-channel';

// Each test configures the channel(s) returned by supabase.channel.
let channels: MockSupabaseChannel[] = [];
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('@/shared/db/client', () => ({
    supabase: {
        channel: (...args: unknown[]) => mockChannel(...args),
        removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
    },
}));

import { useTaskCommentsRealtime } from '@/features/tasks/hooks/useTaskCommentsRealtime';

function makeWrapper() {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: qc }, children);
    return { qc, Wrapper };
}

beforeEach(() => {
    vi.clearAllMocks();
    channels = [];
    mockChannel.mockImplementation(() => {
        const ch = mockSupabaseChannel();
        channels.push(ch);
        return ch;
    });
    mockRemoveChannel.mockImplementation((ch: MockSupabaseChannel) => ch.__markRemoved());
});

describe('useTaskCommentsRealtime (Wave 26)', () => {
    it('subscribes to a per-task channel filtered by task_id and invalidates on INSERT', () => {
        const { Wrapper, qc } = makeWrapper();
        const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

        renderHook(() => useTaskCommentsRealtime('t1'), { wrapper: Wrapper });

        expect(mockChannel).toHaveBeenCalledWith('task_comments:task=t1');
        const [channel] = channels;
        expect(channel.__subscribed).toBe(true);
        expect(channel.on).toHaveBeenCalledWith(
            'postgres_changes',
            expect.objectContaining({
                event: '*',
                schema: 'public',
                table: 'task_comments',
                filter: 'task_id=eq.t1',
            }),
            expect.any(Function),
        );

        channel.__fire('postgres_changes', { eventType: 'INSERT', new: { id: 'c1', task_id: 't1' } });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['taskComments', 't1'] });
    });

    it('fires one invalidate per payload for UPDATE and DELETE events', () => {
        const { Wrapper, qc } = makeWrapper();
        const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

        renderHook(() => useTaskCommentsRealtime('t1'), { wrapper: Wrapper });
        const [channel] = channels;

        channel.__fire('postgres_changes', { eventType: 'UPDATE', new: { id: 'c1' } });
        channel.__fire('postgres_changes', { eventType: 'DELETE', old: { id: 'c1' } });

        expect(invalidateSpy).toHaveBeenCalledTimes(2);
        expect(invalidateSpy).toHaveBeenNthCalledWith(1, { queryKey: ['taskComments', 't1'] });
        expect(invalidateSpy).toHaveBeenNthCalledWith(2, { queryKey: ['taskComments', 't1'] });
    });

    it('removes the channel on unmount', () => {
        const { Wrapper } = makeWrapper();
        const { unmount } = renderHook(() => useTaskCommentsRealtime('t1'), { wrapper: Wrapper });
        const [channel] = channels;

        unmount();

        expect(mockRemoveChannel).toHaveBeenCalledWith(channel);
        expect(channel.__removed).toBe(true);
    });

    it('does not call supabase.channel when taskId is null', () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useTaskCommentsRealtime(null), { wrapper: Wrapper });

        expect(mockChannel).not.toHaveBeenCalled();
    });

    it('tears down the prior channel and opens a new one when taskId changes', () => {
        const { Wrapper } = makeWrapper();
        const { rerender } = renderHook(({ id }) => useTaskCommentsRealtime(id), {
            wrapper: Wrapper,
            initialProps: { id: 't1' as string | null },
        });
        expect(channels).toHaveLength(1);

        rerender({ id: 't2' });

        expect(mockRemoveChannel).toHaveBeenCalledWith(channels[0]);
        expect(channels).toHaveLength(2);
        expect(mockChannel).toHaveBeenNthCalledWith(2, 'task_comments:task=t2');
    });
});
