import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makeNotificationPref } from '@test';
import type { ReactNode } from 'react';

const mockGetPreferences = vi.fn();
const mockUpdatePreferences = vi.fn();
const mockListLog = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/shared/api/planterClient', () => ({
    planter: {
        notifications: {
            getPreferences: () => mockGetPreferences(),
            updatePreferences: (patch: unknown) => mockUpdatePreferences(patch),
            listLog: (opts: unknown) => mockListLog(opts),
        },
    },
}));

vi.mock('sonner', () => ({
    toast: { error: (...args: unknown[]) => mockToastError(...args) },
}));

import {
    useNotificationPreferences,
    useUpdateNotificationPreferences,
    useNotificationLog,
} from '@/features/settings/hooks/useNotificationPreferences';

function wrapper({ children }: { children: ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useNotificationPreferences (Wave 30)', () => {
    beforeEach(() => {
        mockGetPreferences.mockReset();
        mockUpdatePreferences.mockReset();
        mockListLog.mockReset();
        mockToastError.mockReset();
    });

    it('useNotificationPreferences surfaces the query result', async () => {
        const row = makeNotificationPref();
        mockGetPreferences.mockResolvedValue(row);
        const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
        await waitFor(() => expect(result.current.data).toEqual(row));
    });

    it('useNotificationLog honors opts and returns rows', async () => {
        mockListLog.mockResolvedValue([]);
        const { result } = renderHook(() => useNotificationLog({ limit: 5 }), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(mockListLog).toHaveBeenCalledWith({ limit: 5 });
    });

    it('optimistically updates cache + toasts on rollback', async () => {
        const initial = makeNotificationPref({ email_overdue_digest: 'daily' });
        mockGetPreferences.mockResolvedValue(initial);
        mockUpdatePreferences.mockRejectedValueOnce(new Error('boom'));

        const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        function Wrap({ children }: { children: ReactNode }) {
            return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
        }

        // Seed the cache with a successful read first.
        const prefs = renderHook(() => useNotificationPreferences(), { wrapper: Wrap });
        await waitFor(() => expect(prefs.result.current.data).toEqual(initial));

        const mut = renderHook(() => useUpdateNotificationPreferences(), { wrapper: Wrap });
        await mut.result.current.mutateAsync({ email_overdue_digest: 'weekly' }).catch(() => {});

        await waitFor(() => expect(mockToastError).toHaveBeenCalled());
        // Cache eventually rolls back to the pre-mutation row via onError + invalidate.
        await waitFor(() => {
            const cur = qc.getQueryData(['notificationPreferences']);
            expect(cur).toEqual(initial);
        });
    });
});
