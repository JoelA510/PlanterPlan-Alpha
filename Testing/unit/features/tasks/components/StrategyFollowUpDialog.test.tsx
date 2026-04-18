import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makeTask } from '@test';
import type { TaskRow } from '@/shared/db/app.types';

// ---- Mocks (declared BEFORE component import) ----

const mockClone = vi.fn();
vi.mock('@/shared/api/planterClient', () => ({
    planter: {
        entities: {
            Task: {
                clone: (...args: unknown[]) => mockClone(...args),
            },
        },
    },
}));

vi.mock('@/shared/db/client', () => ({
    supabase: {
        auth: {
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
        },
    },
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => mockToastSuccess(...args),
        error: (...args: unknown[]) => mockToastError(...args),
    },
}));

// Minimal useAuth stub so we control `user.id`.
const authHolder = { user: { id: 'user-1' } as { id: string } | null };
vi.mock('@/shared/contexts/AuthContext', () => ({
    useAuth: () => ({ user: authHolder.user }),
}));

// Replace MasterLibrarySearch with a simple button that triggers `onSelect`
// so the test can drive the flow without fighting the real combobox.
vi.mock('@/features/library/components/MasterLibrarySearch', () => ({
    default: ({ onSelect }: { onSelect?: (task: { id: string; title?: string }) => void }) => (
        <button
            type="button"
            data-testid="pick-template-stub"
            onClick={() => onSelect?.({ id: 'tmpl-42', title: 'Follow-up One' })}
        >
            pick
        </button>
    ),
}));

import StrategyFollowUpDialog from '@/features/tasks/components/StrategyFollowUpDialog';

function renderDialog(task: TaskRow, open = true) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const onOpenChange = vi.fn();
    const utils = render(
        <QueryClientProvider client={queryClient}>
            <StrategyFollowUpDialog
                task={task}
                open={open}
                onOpenChange={onOpenChange}
                excludeTemplateIds={[]}
            />
        </QueryClientProvider>,
    );
    return { ...utils, invalidateSpy, onOpenChange, queryClient };
}

beforeEach(() => {
    vi.clearAllMocks();
    authHolder.user = { id: 'user-1' };
});

describe('StrategyFollowUpDialog (Wave 24 Task 2)', () => {
    it('renders the follow-up prompt when open', () => {
        renderDialog(
            makeTask({
                id: 't-strat',
                parent_task_id: 'parent-A',
                root_id: 'proj-1',
                status: 'completed',
            }) as TaskRow,
        );
        expect(screen.getByText(/Add follow-up tasks/i)).toBeDefined();
        expect(screen.getByTestId('pick-template-stub')).toBeDefined();
    });

    it('clones the selected template as a sibling and invalidates projectHierarchy', async () => {
        mockClone.mockResolvedValueOnce({ data: { id: 'new-id' }, error: null });
        const task = makeTask({
            id: 't-strat',
            parent_task_id: 'parent-A',
            root_id: 'proj-1',
            status: 'completed',
        }) as TaskRow;
        const { invalidateSpy } = renderDialog(task);

        await act(async () => {
            fireEvent.click(screen.getByTestId('pick-template-stub'));
        });

        await waitFor(() => expect(mockClone).toHaveBeenCalledTimes(1));
        expect(mockClone).toHaveBeenCalledWith('tmpl-42', 'parent-A', 'instance', 'user-1');
        expect(invalidateSpy).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ['projectHierarchy', 'proj-1'] }),
        );
        expect(mockToastSuccess).toHaveBeenCalled();
    });

    it('uses the task id as rootId when root_id is absent', async () => {
        mockClone.mockResolvedValueOnce({ data: { id: 'new-id' }, error: null });
        const task = makeTask({
            id: 't-strat',
            parent_task_id: null,
            root_id: null,
            status: 'completed',
        }) as TaskRow;
        const { invalidateSpy } = renderDialog(task);

        await act(async () => {
            fireEvent.click(screen.getByTestId('pick-template-stub'));
        });

        await waitFor(() => expect(mockClone).toHaveBeenCalled());
        expect(mockClone).toHaveBeenCalledWith('tmpl-42', null, 'instance', 'user-1');
        expect(invalidateSpy).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ['projectHierarchy', 't-strat'] }),
        );
    });

    it('surfaces an error toast and skips clone when the user is not signed in', async () => {
        authHolder.user = null;
        const task = makeTask({
            id: 't-strat',
            parent_task_id: 'parent-A',
            root_id: 'proj-1',
            status: 'completed',
        }) as TaskRow;
        renderDialog(task);

        await act(async () => {
            fireEvent.click(screen.getByTestId('pick-template-stub'));
        });

        expect(mockClone).not.toHaveBeenCalled();
        expect(mockToastError).toHaveBeenCalledWith('Not signed in');
    });

    it('surfaces an error toast when Task.clone returns an error', async () => {
        mockClone.mockResolvedValueOnce({ data: null, error: new Error('permission denied') });
        const task = makeTask({
            id: 't-strat',
            parent_task_id: 'parent-A',
            root_id: 'proj-1',
            status: 'completed',
        }) as TaskRow;
        renderDialog(task);

        await act(async () => {
            fireEvent.click(screen.getByTestId('pick-template-stub'));
        });

        await waitFor(() => expect(mockToastError).toHaveBeenCalled());
        expect(mockToastSuccess).not.toHaveBeenCalled();
    });

    it('closes via the footer button', () => {
        const { onOpenChange } = renderDialog(
            makeTask({
                id: 't-strat',
                parent_task_id: 'parent-A',
                root_id: 'proj-1',
                status: 'completed',
            }) as TaskRow,
        );
        fireEvent.click(screen.getByTestId('strategy-followup-done'));
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
