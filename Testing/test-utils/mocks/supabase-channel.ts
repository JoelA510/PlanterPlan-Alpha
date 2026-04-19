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
    /** Wave 27: mock for `channel.track(state)` — returns the stored payload via `__trackedState`. */
    track: ReturnType<typeof vi.fn>;
    /** Wave 27: mock for `channel.untrack()`. */
    untrack: ReturnType<typeof vi.fn>;
    /** True once `.subscribe()` has been called. */
    __subscribed: boolean;
    /** True once `removeChannel(this)` has been called via `.__markRemoved()`. */
    __removed: boolean;
    /** Last payload passed to `.track(...)`, or `null` when untracked. */
    __trackedState: unknown;
    /** Test-only helper: invoke every handler registered for `event` with `payload`. */
    __fire: (event: ChannelEvent, payload: unknown) => void;
    /**
     * Wave 27 — fire a presence event. Looks up every handler registered via
     * `.on('presence', { event }, handler)` and invokes those whose stored
     * sub-event matches (`sync`, `join`, `leave`). Handlers registered without
     * an `event` filter receive every presence fire.
     */
    __firePresence: (event: 'sync' | 'join' | 'leave', payload?: unknown) => void;
    /** Wave 27: set the value returned by `channel.presenceState()`. */
    __setPresenceState: (state: Record<string, unknown[]>) => void;
    /** Test-only helper: mark the channel as removed (called by `removeChannel` stubs). */
    __markRemoved: () => void;
    /** Wave 27 — read the state that the presenceState() method returns. */
    presenceState: <T = unknown>() => Record<string, T[]>;
}

interface PresenceHandlerSlot {
    handler: (payload: unknown) => void;
    subEvent: 'sync' | 'join' | 'leave' | undefined;
}

export function mockSupabaseChannel(): MockSupabaseChannel {
    const handlers = new Map<ChannelEvent, Array<(payload: unknown) => void>>();
    const presenceHandlers: PresenceHandlerSlot[] = [];
    let presenceStateStore: Record<string, unknown[]> = {};

    const channel = {
        on: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        track: vi.fn(),
        untrack: vi.fn(),
        __subscribed: false,
        __removed: false,
        __trackedState: null,
        __fire(event: ChannelEvent, payload: unknown) {
            const list = handlers.get(event);
            if (!list) return;
            for (const h of list) h(payload);
        },
        __firePresence(event: 'sync' | 'join' | 'leave', payload?: unknown) {
            for (const slot of presenceHandlers) {
                if (slot.subEvent === undefined || slot.subEvent === event) {
                    slot.handler(payload ?? {});
                }
            }
        },
        __setPresenceState(state: Record<string, unknown[]>) {
            presenceStateStore = state;
        },
        __markRemoved() {
            channel.__removed = true;
            channel.__trackedState = null;
        },
        presenceState: <T = unknown>(): Record<string, T[]> =>
            presenceStateStore as Record<string, T[]>,
    } as MockSupabaseChannel;

    // Handles three shapes:
    //   .on('postgres_changes', { event: '*', ... }, handler)
    //   .on('presence', { event: 'sync' | 'join' | 'leave' }, handler)
    //   .on(event, handler)
    channel.on.mockImplementation((event: ChannelEvent, ...rest: unknown[]) => {
        const handler = rest[rest.length - 1] as (payload: unknown) => void;
        if (typeof handler !== 'function') return channel;
        if (event === 'presence') {
            const filter = rest.length > 1 ? (rest[0] as { event?: 'sync' | 'join' | 'leave' }) : undefined;
            presenceHandlers.push({ handler, subEvent: filter?.event });
            return channel;
        }
        const list = handlers.get(event) ?? [];
        list.push(handler);
        handlers.set(event, list);
        return channel;
    });

    channel.subscribe.mockImplementation((cb?: (status: string, err?: unknown) => void) => {
        channel.__subscribed = true;
        if (cb) cb('SUBSCRIBED');
        return channel;
    });

    channel.unsubscribe.mockImplementation(() => channel);

    channel.track.mockImplementation((state: unknown) => {
        channel.__trackedState = state;
        return Promise.resolve('ok');
    });

    channel.untrack.mockImplementation(() => {
        channel.__trackedState = null;
        return Promise.resolve('ok');
    });

    return channel;
}
