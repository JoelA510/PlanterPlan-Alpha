import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PeopleList from './PeopleList';
import { peopleService } from '../services/peopleService';

// Mocks
vi.mock('../services/peopleService', () => ({
    peopleService: {
        getPeople: vi.fn(),
        addPerson: vi.fn(),
        deletePerson: vi.fn(),
        updatePerson: vi.fn(),
    },
}));

vi.mock('@/shared/ui/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

// Mock UI components
vi.mock('@/shared/ui/dialog', () => ({
    Dialog: ({ open, children }) => open ? <div>{children}</div> : null,
    DialogContent: ({ children }) => <div>{children}</div>,
    DialogHeader: ({ children }) => <div>{children}</div>,
    DialogTitle: ({ children }) => <h2>{children}</h2>,
    DialogFooter: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }) => <div>{children}</div>,
    DropdownMenuContent: ({ children }) => <div>{children}</div>,
    DropdownMenuItem: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}));

describe('PeopleList', () => {
    const mockPeople = [
        { id: 1, first_name: 'John', last_name: 'Doe', role: 'Volunteer', status: 'New', email: 'john@example.com' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        peopleService.getPeople.mockResolvedValue(mockPeople);
    });

    it('renders people list', async () => {
        render(<PeopleList projectId="123" />);
        await screen.findByText('John Doe');
        expect(screen.getByText('Volunteer')).toBeInTheDocument();
        expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('opens add person modal', async () => {
        render(<PeopleList projectId="123" canEdit={true} />);
        await screen.findByText('John Doe');

        // Find the trigger button (initially only one 'Add Person' text or use getAllByText if needed)
        // Initially modal is closed, so only one.
        const addButton = screen.getByRole('button', { name: /add person/i });
        fireEvent.click(addButton);

        // Now modal is open. There are multiple 'Add Person' texts (Button, Title, Submit Button).
        // Expect the Heading to be present
        expect(screen.getByRole('heading', { name: 'Add Person' })).toBeInTheDocument();
    });
});
