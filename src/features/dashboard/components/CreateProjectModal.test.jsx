/**
 * CreateProjectModal.test.jsx
 * 
 * Regression tests for the Create Project flow.
 * Specifically tests that the modal passes correct field names to onCreate callback.
 * 
 * Bug Fixed (PR #102): Modal was sending `name` but mutations expected `title`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateProjectModal from './CreateProjectModal';

// Mock the planterClient
vi.mock('@shared/api/planterClient', () => ({
    planter: {
        entities: {
            Project: {
                list: vi.fn().mockResolvedValue([]),
            },
        },
    },
}));

// Mock date-fns format to avoid date issues in tests
vi.mock('date-fns', async () => {
    const actual = await vi.importActual('date-fns');
    return {
        ...actual,
        format: vi.fn((date) => date?.toISOString?.() || 'Mocked Date'),
    };
});

const renderModal = (props = {}) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    const defaultProps = {
        open: true,
        onClose: vi.fn(),
        onCreate: vi.fn(),
        ...props,
    };

    return {
        ...render(
            <QueryClientProvider client={queryClient}>
                <CreateProjectModal {...defaultProps} />
            </QueryClientProvider>
        ),
        ...defaultProps,
    };
};

describe('CreateProjectModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Step Navigation', () => {
        it('shows template selection on initial render', () => {
            renderModal();

            expect(screen.getByText('Choose a Template')).toBeInTheDocument();
            expect(screen.getByText('Launch Large')).toBeInTheDocument();
            expect(screen.getByText('Multisite')).toBeInTheDocument();
            expect(screen.getByText('Multiplication')).toBeInTheDocument();
        });

        it('moves to step 2 when template is selected', async () => {
            renderModal();

            fireEvent.click(screen.getByText('Launch Large'));

            // Wait for the label to appear (animation takes time)
            const projectNameInput = await screen.findByLabelText(/project name/i);
            expect(projectNameInput).toBeInTheDocument();
            expect(screen.getByText('Project Details')).toBeInTheDocument();
        });
    });

    describe('Form Field Mapping (Regression)', () => {
        /**
         * CRITICAL REGRESSION TEST
         * This test ensures the bug where `name` was sent instead of `title` doesn't recur.
         */
        it('passes title field correctly to onCreate callback', async () => {
            const mockOnCreate = vi.fn().mockResolvedValue({});
            renderModal({ onCreate: mockOnCreate });

            // Step 1: Select template
            fireEvent.click(screen.getByText('Multisite'));

            // Step 2: Fill in project details
            await waitFor(() => {
                expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
            });

            const titleInput = screen.getByLabelText(/project name/i);
            fireEvent.change(titleInput, { target: { value: 'Test Church Plant' } });

            // Submit
            const createBtn = screen.getByRole('button', { name: /create project/i });
            fireEvent.click(createBtn);

            await waitFor(() => {
                expect(mockOnCreate).toHaveBeenCalledTimes(1);
            });

            // CRITICAL ASSERTION: Verify `title` field is present (not `name`)
            const calledWith = mockOnCreate.mock.calls[0][0];
            expect(calledWith).toHaveProperty('title', 'Test Church Plant');
            expect(calledWith).not.toHaveProperty('name'); // Should NOT have legacy field
        });

        it('maps template to templateId correctly', async () => {
            const mockOnCreate = vi.fn().mockResolvedValue({});
            renderModal({ onCreate: mockOnCreate });

            // Select "launch_large" template
            fireEvent.click(screen.getByText('Launch Large'));

            await waitFor(() => {
                expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
            });

            fireEvent.change(screen.getByLabelText(/project name/i), {
                target: { value: 'My Project' },
            });

            fireEvent.click(screen.getByRole('button', { name: /create project/i }));

            await waitFor(() => {
                expect(mockOnCreate).toHaveBeenCalled();
            });

            const calledWith = mockOnCreate.mock.calls[0][0];
            expect(calledWith).toHaveProperty('templateId', 'launch_large');
            expect(calledWith).toHaveProperty('template', 'launch_large');
        });
    });

    describe('UI State Management', () => {
        it('disables Create button when title is empty', async () => {
            renderModal();

            fireEvent.click(screen.getByText('Multiplication'));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument();
            });

            const createBtn = screen.getByRole('button', { name: /create project/i });
            expect(createBtn).toBeDisabled();
        });

        it('enables Create button when title is provided', async () => {
            renderModal();

            fireEvent.click(screen.getByText('Multiplication'));

            await waitFor(() => {
                expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
            });

            fireEvent.change(screen.getByLabelText(/project name/i), {
                target: { value: 'New Church' },
            });

            const createBtn = screen.getByRole('button', { name: /create project/i });
            expect(createBtn).not.toBeDisabled();
        });

        it('resets form after successful creation', async () => {
            const mockOnCreate = vi.fn().mockResolvedValue({});
            const mockOnClose = vi.fn();
            renderModal({ onCreate: mockOnCreate, onClose: mockOnClose });

            fireEvent.click(screen.getByText('Launch Large'));

            await waitFor(() => {
                expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
            });

            fireEvent.change(screen.getByLabelText(/project name/i), {
                target: { value: 'Test Church' },
            });

            fireEvent.click(screen.getByRole('button', { name: /create project/i }));

            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalled();
            });
        });
    });

    describe('No Confusing UI Elements (UX Regression)', () => {
        /**
         * Regression: Previously had "Primary/Secondary" project type selector that confused users.
         */
        it('does not show project type selector', async () => {
            renderModal();

            fireEvent.click(screen.getByText('Launch Large'));

            await waitFor(() => {
                expect(screen.getByText('Project Details')).toBeInTheDocument();
            });

            // These elements should NOT exist
            expect(screen.queryByText(/primary project/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/secondary project/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/project type/i)).not.toBeInTheDocument();
        });
    });
});
