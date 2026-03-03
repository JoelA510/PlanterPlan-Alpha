/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import NewTaskForm from './NewTaskForm';
import type { TaskFormData } from '@/shared/db/app.types';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, whileHover: _h, whileTap: _t, ...props }: any) => <div {...props}>{children}</div>,
    },
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
                renderLibrarySearch={(onSelect) => (
                    <button
                        data-testid="library-search-mock"
                        onClick={() => act(() => onSelect({ id: 'lib-1', title: 'Library Task' }))}
                    />
                )}
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

    it('should populate fields correctly in Edit Mode', async () => {
        const initialTask = {
            id: 'task-123',
            title: 'Existing Task',
            description: 'Existing Description',
            start_date: '2024-02-01T00:00:00Z',
            due_date: '2024-02-10T00:00:00Z',
        };

        render(
            <NewTaskForm
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
                initialTask={initialTask}
                origin="instance"
            />
        );

        expect(screen.getByLabelText(/Task Title/i)).toHaveValue('Existing Task');
        expect(screen.getByLabelText(/Description/i)).toHaveValue('Existing Description');
        // slice(0,10) logic should show YYYY-MM-DD
        expect(screen.getByLabelText(/Start Date/i)).toHaveValue('2024-02-01');
        expect(screen.getByLabelText(/Due Date/i)).toHaveValue('2024-02-10');
    });

    it('should update form fields when a library task is applied', async () => {
        render(
            <NewTaskForm 
                onSubmit={vi.fn()} 
                onCancel={vi.fn()} 
                origin="instance"
                renderLibrarySearch={(onSelect) => (
                    <button
                        data-testid="library-search-mock"
                        onClick={() => act(() => onSelect({ id: 'lib-1', title: 'Library Task' }))}
                    />
                )}
            />
        );

        const applyBtn = screen.getByTestId('library-search-mock');
        fireEvent.click(applyBtn);

        // Verify the title input was updated
        expect(screen.getByLabelText(/Task Title/i)).toHaveValue('Library Task');

        // Verify the success message appears
        expect(screen.getByText(/Copied details from/i)).toBeInTheDocument();
        expect(screen.getByText('Library Task')).toBeInTheDocument();
    });
});
