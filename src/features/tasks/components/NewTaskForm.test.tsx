import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewTaskForm from './NewTaskForm';
import type { TaskFormData } from '@/shared/db/app.types';
import '@testing-library/jest-dom';

// Mock MasterLibrarySearch since it's external to this unit
vi.mock('@/features/library', () => ({
    MasterLibrarySearch: () => <div data-testid="library-search" />
}));

describe('NewTaskForm Registry Strictness', () => {
    it('should emit a payload strictly conforming to TaskFormData on submit', async () => {
        const onSubmit = vi.fn();
        const onCancel = vi.fn();

        render(
            <NewTaskForm
                onSubmit={onSubmit}
                onCancel={onCancel}
                origin="instance"
            />
        );

        // Fill out the form
        fireEvent.change(screen.getByLabelText(/Task Title/i), { target: { value: 'Regression Test Task' } });
        fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test Description' } });
        fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2024-01-01' } });
        fireEvent.change(screen.getByLabelText(/Due Date/i), { target: { value: '2024-01-15' } });

        // Submit the form
        const submitBtn = screen.getByRole('button', { name: /Add New Task/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalled();
        });

        const payload: TaskFormData = onSubmit.mock.calls[0][0];

        // Strict interface assertions
        expect(payload).toMatchObject({
            title: 'Regression Test Task',
            description: 'Test Description',
            start_date: '2024-01-01',
            due_date: '2024-01-15',
        });

        // Ensure no stray internal fields like 'register' or 'watch' from RHF are leaked
        expect(payload).not.toHaveProperty('register');
        expect(payload).not.toHaveProperty('watch');
    });

    it('should block submission if due date is before start date', async () => {
        const onSubmit = vi.fn();
        render(<NewTaskForm onSubmit={onSubmit} onCancel={vi.fn()} origin="instance" />);

        fireEvent.change(screen.getByLabelText(/Task Title/i), { target: { value: 'Invalid Dates Task' } });
        fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2024-01-15' } });
        fireEvent.change(screen.getByLabelText(/Due Date/i), { target: { value: '2024-01-01' } });

        const submitBtn = screen.getByRole('button', { name: /Add New Task/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText(/Due date cannot be before start date/i)).toBeInTheDocument();
        });

        expect(onSubmit).not.toHaveBeenCalled();
    });
});
