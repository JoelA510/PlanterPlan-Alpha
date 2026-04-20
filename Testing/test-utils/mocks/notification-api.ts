import { vi } from 'vitest';

export interface NotificationMockState {
    requestPermission: ReturnType<typeof vi.fn>;
    setPermission: (v: NotificationPermission) => void;
}

/**
 * Install a jsdom-compatible `Notification` stub. The returned handle lets
 * tests flip `Notification.permission` mid-test (e.g. simulating `granted`
 * after `requestPermission()` resolves).
 */
export function installNotificationMock(initialPermission: NotificationPermission = 'default'): NotificationMockState {
    let current: NotificationPermission = initialPermission;
    const requestPermission = vi.fn(async () => current);

    class NotificationStub {
        static get permission(): NotificationPermission {
            return current;
        }
        static requestPermission(): Promise<NotificationPermission> {
            return requestPermission();
        }
    }

    Object.defineProperty(globalThis, 'Notification', {
        configurable: true,
        writable: true,
        value: NotificationStub,
    });

    return {
        requestPermission,
        setPermission: (v) => {
            current = v;
        },
    };
}
