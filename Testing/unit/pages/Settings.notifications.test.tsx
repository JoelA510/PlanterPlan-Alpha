import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { makeNotificationPref } from '@test';

const mockPrefs = makeNotificationPref({ email_mentions: true, email_overdue_digest: 'daily' });
const mockUpdatePatch = vi.fn();

vi.mock('@/features/settings/hooks/useNotificationPreferences', () => ({
    useNotificationPreferences: () => ({ data: mockPrefs, isLoading: false, isError: false }),
    useUpdateNotificationPreferences: () => ({ mutate: mockUpdatePatch }),
    useNotificationLog: () => ({ data: [], isLoading: false }),
}));

// The existing Settings page reads `useSettings`; stub it so we're not testing
// the Profile/Security tabs here.
vi.mock('@/features/settings/hooks/useSettings', () => ({
    useSettings: () => ({
        state: {
            profile: { avatar_url: '', full_name: '', role: '', organization: '', email_frequency: 'never' },
            loading: false,
            avatarError: null,
            passwordForm: { newPassword: '', confirmPassword: '' },
            passwordError: null,
            passwordLoading: false,
        },
        actions: {
            setProfile: vi.fn(),
            setPasswordForm: vi.fn(),
            setPasswordError: vi.fn(),
            handlePasswordChange: vi.fn(),
        },
    }),
}));

import Settings from '@/pages/Settings';

function renderSettings() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    function Wrap({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={qc}>
                <MemoryRouter>{children}</MemoryRouter>
            </QueryClientProvider>
        );
    }
    return render(
        <Wrap>
            <Settings />
        </Wrap>,
    );
}

describe('Settings — Notifications tab (Wave 30)', () => {
    beforeEach(() => {
        mockUpdatePatch.mockReset();
    });

    it('clicking the Notifications nav shows the tab body', async () => {
        renderSettings();
        fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
        await waitFor(() => {
            expect(screen.getByTestId('settings-notifications')).toBeInTheDocument();
        });
    });

    it('mutates when the user flips the Email Mentions switch', async () => {
        renderSettings();
        fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
        // Email/Push both label a row 'Mentions'; target by element id.
        await screen.findByTestId('settings-notifications');
        const emailMentions = document.getElementById('email-mentions') as HTMLButtonElement;
        expect(emailMentions).toBeInTheDocument();
        fireEvent.click(emailMentions);
        expect(mockUpdatePatch).toHaveBeenCalledWith(
            expect.objectContaining({ email_mentions: false }),
        );
    });

    it('push toggles are disabled until browser push is enabled', async () => {
        renderSettings();
        fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
        await screen.findByTestId('settings-notifications');
        const pushSwitch = document.getElementById('push-mentions') as HTMLButtonElement;
        const emailSwitch = document.getElementById('email-mentions') as HTMLButtonElement;
        expect(pushSwitch).toBeInTheDocument();
        expect(pushSwitch).toBeDisabled();
        expect(emailSwitch).not.toBeDisabled();
    });

    it('renders the disabled Enable browser push button with a Wave 30 Task 2 tooltip', async () => {
        renderSettings();
        fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
        const btn = await screen.findByTestId('enable-browser-push');
        expect(btn).toBeDisabled();
        expect(btn).toHaveAttribute('title', expect.stringMatching(/wave 30 task 2/i));
    });
});
