import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NewTaskForm from './NewTaskForm';

// Mock dependencies
jest.mock('../../hooks/useTaskForm', () => ({
    useTaskForm: (initialState) => ({
        formData: initialState,
        setFormData: jest.fn(),
        errors: {},
        isSubmitting: false,
        lastAppliedTaskTitle: null,
        handleChange: jest.fn(),
        handleApplyFromLibrary: jest.fn(),
        handleSubmit: (e, onSubmit, onSuccess) => {
            e.preventDefault();
            onSubmit(initialState);
            onSuccess();
        },
    }),
}));

jest.mock('../molecules/MasterLibrarySearch', () => () => <div data-testid="library-search">Library Search</div>);

describe('NewTaskForm Pinning Test', () => {
    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders create mode correctly', () => {
        render(
            <NewTaskForm
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
                origin="instance"
            />
        );

        expect(screen.getByLabelText(/Task Title/i)).toBeInTheDocument();
        expect(screen.getByTestId('library-search')).toBeInTheDocument();
        expect(screen.getByText('Add New Task')).toBeInTheDocument();
    });

    it('renders edit mode correctly', () => {
        const initialTask = {
            id: '1',
            title: 'Existing Task',
            description: 'Desc',
            start_date: '2023-01-01',
            due_date: '2023-01-05',
        };

        render(
            <NewTaskForm
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
                initialTask={initialTask}
                submitLabel="Save Changes"
                enableLibrarySearch={false}
            />
        );

        expect(screen.getByDisplayValue('Existing Task')).toBeInTheDocument();
        expect(screen.queryByTestId('library-search')).not.toBeInTheDocument();
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
});
