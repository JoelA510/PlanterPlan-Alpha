import { vi } from 'vitest';

export type ChannelEvent = 'postgres_changes' | 'presence' | string;

/**
 * Mocked Supabase Realtime channel for unit tests.
 *
 * Captures every handler registered via `.on(event, filter, handler)` so
 * tests can fire synthetic payloads through `channel.__fire(event, payload)`.
 * Also exposes `.__subscribed` and `.__removed` flags so tests can assert
 * lifecycle correctness without reaching into vi mock state.
 *
 * Usage:
 *   const channel = mockSupabaseChannel();
 *   const supabaseStub = {
 *     channel: vi.fn(() => channel),
 *     removeChannel: vi.fn((c) => c.__markRemoved()),
 *   };
 *   // …bind to your vi.mock('@/shared/db/client') factory, then:
 *   channel.__fire('postgres_changes', { eventType: 'INSERT', new: {...} });
 */
export interface MockSupabaseChannel {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
    /** True once `.subscribe()` has been called. */
    __subscribed: boolean;
    /** True once `removeChannel(this)` has been called via `.__markRemoved()`. */
    __removed: boolean;
    /** Test-only helper: invoke every handler registered for `event` with `payload`. */
    __fire: (event: ChannelEvent, payload: unknown) => void;
    /** Test-only helper: mark the channel as removed (called by `removeChannel` stubs). */
    __markRemoved: () => void;
}

export function mockSupabaseChannel(): MockSupabaseChannel {
    const handlers = new Map<ChannelEvent, Array<(payload: unknown) => void>>();

    const channel = {
        on: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        __subscribed: false,
        __removed: false,
        __fire(event: ChannelEvent, payload: unknown) {
            const list = handlers.get(event);
            if (!list) return;
            for (const h of list) h(payload);
        },
        __markRemoved() {
            channel.__removed = true;
        },
    } as MockSupabaseChannel;

    // .on(event, filter, handler) — register handler keyed by event name.
    // Signature accepts (event, handler) OR (event, filter, handler) to
    // cover presence-style invocations.
    channel.on.mockImplementation((event: ChannelEvent, ...rest: unknown[]) => {
        const handler = rest[rest.length - 1] as (payload: unknown) => void;
        if (typeof handler === 'function') {
            const list = handlers.get(event) ?? [];
            list.push(handler);
            handlers.set(event, list);
        }
        return channel;
    });

    channel.subscribe.mockImplementation((cb?: (status: string, err?: unknown) => void) => {
        channel.__subscribed = true;
        if (cb) cb('SUBSCRIBED');
        return channel;
    });

    channel.unsubscribe.mockImplementation(() => channel);

    return channel;
}
