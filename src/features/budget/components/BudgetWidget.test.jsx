import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BudgetWidget from './BudgetWidget';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

// Mocks
vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('react-router-dom', () => ({
    useParams: vi.fn(),
}));

vi.mock('../services/budgetService', () => ({
    budgetService: {
        getBudgetItems: vi.fn(() => Promise.resolve([])), // explicit default
        addItem: vi.fn(),
    },
}));

vi.mock('@shared/ui/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

// Mock UI components
vi.mock('@shared/ui/dialog', () => ({
    Dialog: ({ open, children }) => open ? <div>{children}</div> : null,
    DialogContent: ({ children }) => <div>{children}</div>,
    DialogHeader: ({ children }) => <div>{children}</div>,
    DialogTitle: ({ children }) => <h2>{children}</h2>,
    DialogDescription: ({ children }) => <p>{children}</p>,
}));

import { budgetService } from '../services/budgetService';

describe('BudgetWidget', () => {
    const mockItems = [
        { id: 1, description: 'Chairs', planned_amount: 1000, actual_amount: 900, category: 'Equipment', status: 'purchased' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        useParams.mockReturnValue({ projectId: '123' });
        budgetService.getBudgetItems.mockResolvedValue(mockItems);
    });

    it('renders budget summary correctly', async () => {
        render(<BudgetWidget projectId="123" />);
        // Wait for loading to finish
        await screen.findByText('Launch Budget');

        expect(screen.getByText(/1,000/)).toBeInTheDocument(); // Planned
        expect(screen.getByText(/900/)).toBeInTheDocument();   // Actual
    });

    it('opens add item modal on click', async () => {
        render(<BudgetWidget />);
        const addButton = await screen.findByLabelText('Add Budget Item');
        fireEvent.click(addButton);
        expect(screen.getAllByText('Launch Budget')[1]).toBeInTheDocument(); // Modal title
    });
});
