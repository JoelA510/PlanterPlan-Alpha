import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PeopleList from './PeopleList';
import { planter } from '@/shared/api/planterClient';
import React from 'react';

// Mocks
vi.mock('@/shared/api/planterClient', () => ({
    planter: {
        entities: {
            Person: {
                filter: vi.fn(),
                create: vi.fn(),
                delete: vi.fn(),
                update: vi.fn(),
            }
        }
    }
}));

// Mock Sonner Toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

// Mock UI components
vi.mock('@/shared/ui/dialog', () => ({
    Dialog: ({ open, children }: { open?: boolean; children?: React.ReactNode }) => open ? <div>{children}</div> : null,
    DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
    DialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuItem: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
}));

describe('PeopleList', () => {
    const mockPeople = [
        { id: '1', first_name: 'John', last_name: 'Doe', role: 'Volunteer', status: 'New', email: 'john@example.com' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(planter.entities.Person.filter).mockResolvedValue(mockPeople);
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
        const addButton = screen.getByRole('button', { name: /add person/i });
        fireEvent.click(addButton);

        // Now modal is open. Expect the Heading to be present
        expect(screen.getByRole('heading', { name: 'Add Person' })).toBeInTheDocument();
    });
});
