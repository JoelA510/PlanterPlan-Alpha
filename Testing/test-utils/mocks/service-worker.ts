import { vi } from 'vitest';

export interface MockServiceWorkerState {
    register: ReturnType<typeof vi.fn>;
    getRegistration: ReturnType<typeof vi.fn>;
    pushManager: {
        subscribe: ReturnType<typeof vi.fn>;
        getSubscription: ReturnType<typeof vi.fn>;
    };
    activeSubscription: { endpoint: string; keys: { p256dh: string; auth: string }; unsubscribe: ReturnType<typeof vi.fn>; toJSON: () => unknown } | null;
}

/**
 * Install a jsdom-compatible stub for `navigator.serviceWorker` + `window.PushManager`.
 * Returns the mocks so tests can assert calls and flip `activeSubscription`.
 *
 * Must be called INSIDE `beforeEach` (or the suite's first render call) — we
 * redefine the properties so re-install is safe.
 */
export function installServiceWorkerMock(): MockServiceWorkerState {
    const subscribeMock = vi.fn();
    const getSubscriptionMock = vi.fn();
    const pushManager = { subscribe: subscribeMock, getSubscription: getSubscriptionMock };

    const registration = { pushManager, scope: '/' };
    const register = vi.fn().mockResolvedValue(registration);
    const getRegistration = vi.fn().mockResolvedValue(registration);

    const swStub = { register, getRegistration, ready: Promise.resolve(registration), controller: null };

    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
        configurable: true,
        get: () => swStub,
    });
    // PushManager constructor stub — the hook checks with `'PushManager' in window`.
    class PushManagerStub {}
    Object.defineProperty(globalThis, 'PushManager', {
        configurable: true,
        writable: true,
        value: PushManagerStub,
    });
    (globalThis as unknown as { PushManager?: typeof PushManagerStub }).PushManager ??= PushManagerStub;
    const win = (globalThis as unknown as { window?: Record<string, unknown> }).window;
    if (win) win.PushManager = PushManagerStub;

    return {
        register,
        getRegistration,
        pushManager,
        activeSubscription: null,
    };
}
