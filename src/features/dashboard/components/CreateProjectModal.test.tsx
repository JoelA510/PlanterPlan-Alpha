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
vi.mock('@/shared/api/planterClient', () => ({
    planter: {
        entities: {
            Project: {
                list: vi.fn().mockResolvedValue([]),
            },
        },
    },
}));

// Mock date-engine formatDate to avoid date issues in tests
vi.mock('@/shared/lib/date-engine', async () => {
    const actual = await vi.importActual('@/shared/lib/date-engine');
    return {
        ...actual,
        formatDate: vi.fn((date) => {
            if (!date) return '';
            // Handle different date formats for consistency in tests
            const d = typeof date === 'string' ? new Date(date) : date;
            return d?.toISOString?.() || 'Mocked Date';
        }),
    };
});

const renderModal = (props = {}) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    const defaultProps = {
        open: true,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
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

            expect(screen.getByText('Start New Project')).toBeInTheDocument();
            expect(screen.getByText('New Church Plant')).toBeInTheDocument();
            expect(screen.getByText('Community Outreach')).toBeInTheDocument();
            expect(screen.getByText('Leadership Training')).toBeInTheDocument();
        });

        it('moves to step 2 when template is selected', async () => {
            renderModal();

            const template = await screen.findByText(/New Church Plant/i);
            fireEvent.click(template);

            // Move to step 2
            const continueBtn = screen.getByText(/Continue to Details/i);
            fireEvent.click(continueBtn);

            // Wait for the label to appear
            const projectNameInput = await screen.findByLabelText(/project name/i);
            expect(projectNameInput).toBeInTheDocument();
            expect(screen.getByText(/Project Details/i)).toBeInTheDocument();
        });
    });

    describe('Form Field Mapping (Regression)', () => {
        /**
         * CRITICAL REGRESSION TEST
         * This test ensures the bug where `name` was sent instead of `title` doesn't recur.
         */
        it('passes title field correctly to onSubmit callback', async () => {
            const mockOnSubmit = vi.fn().mockResolvedValue({});
            renderModal({ onSubmit: mockOnSubmit });

            // Step 1: Select template
            const template = await screen.findByText(/Community Outreach/i);
            fireEvent.click(template);

            const continueBtn = screen.getByText(/Continue to Details/i);
            fireEvent.click(continueBtn);

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
                expect(mockOnSubmit).toHaveBeenCalledTimes(1);
            });

            // CRITICAL ASSERTION: Verify `title` field is used
            const calledWith = mockOnSubmit.mock.calls[0][0];
            expect(calledWith).toHaveProperty('title', 'Test Church Plant');
            expect(calledWith).not.toHaveProperty('name');
        });

        it('maps template to templateId correctly', async () => {
            const mockOnSubmit = vi.fn().mockResolvedValue({});
            renderModal({ onSubmit: mockOnSubmit });

            // Select "new-church" template
            const template = await screen.findByText(/New Church Plant/i);
            fireEvent.click(template);

            const continueBtn = screen.getByText(/Continue to Details/i);
            fireEvent.click(continueBtn);

            await waitFor(() => {
                expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
            });

            fireEvent.change(screen.getByLabelText(/project name/i), {
                target: { value: 'My Project' },
            });

            fireEvent.click(screen.getByRole('button', { name: /create project/i }));

            await waitFor(() => {
                expect(mockOnSubmit).toHaveBeenCalled();
            });

            const calledWith = mockOnSubmit.mock.calls[0][0];
            expect(calledWith).toHaveProperty('template', 'new-church');
        });
    });

    describe('UI State Management', () => {
        it('disables Create button when title is empty', async () => {
            renderModal();

            const template = await screen.findByText(/Leadership Training/i);
            fireEvent.click(template);

            const continueBtn = await screen.findByRole('button', { name: /continue to details/i });
            fireEvent.click(continueBtn);

            const createBtn = await screen.findByRole('button', { name: /create project/i });
            expect(createBtn).toBeDisabled();
        });

        it('enables Create button when title is provided', async () => {
            renderModal();
            const template = await screen.findByText(/Leadership Training/i);
            fireEvent.click(template);

            const continueBtn = await screen.findByRole('button', { name: /continue to details/i });
            fireEvent.click(continueBtn);

            const projectNameInput = await screen.findByLabelText(/project name/i);
            fireEvent.change(projectNameInput, { target: { value: 'New Goal' } });

            const createBtn = await screen.findByRole('button', { name: /create project/i });
            expect(createBtn).toBeEnabled();
        });

        it('resets form after successful creation', async () => {
            const mockOnSubmit = vi.fn().mockResolvedValue({});
            const mockOnClose = vi.fn();
            renderModal({ onSubmit: mockOnSubmit, onClose: mockOnClose });

            const template = await screen.findByText(/New Church Plant/i);
            fireEvent.click(template);

            const continueBtn = await screen.findByRole('button', { name: /continue to details/i });
            fireEvent.click(continueBtn);

            const titleInput = await screen.findByLabelText(/project name/i);
            fireEvent.change(titleInput, { target: { value: 'Test Church' } });

            const createBtn = await screen.findByRole('button', { name: /create project/i });
            fireEvent.click(createBtn);

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

            const template = await screen.findByText(/New Church Plant/i);
            fireEvent.click(template);

            const continueBtn = await screen.findByRole('button', { name: /continue to details/i });
            fireEvent.click(continueBtn);

            await screen.findByText(/Project Details/i);

            // These elements should NOT exist
            expect(screen.queryByText(/primary project/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/secondary project/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/project type/i)).not.toBeInTheDocument();
        });
    });
});
