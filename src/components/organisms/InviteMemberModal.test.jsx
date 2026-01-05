import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InviteMemberModal from './InviteMemberModal';
import '@testing-library/jest-dom';

// Mock ReactDOM.createPortal to render children directly
jest.mock('react-dom', () => ({
    ...jest.requireActual('react-dom'),
    createPortal: (node) => node,
}));

describe('InviteMemberModal', () => {
    const mockProject = { id: 'test-project', title: 'Test Project' };
    const mockOnClose = jest.fn();

    it('renders correctly', () => {
        render(
            <InviteMemberModal
                project={mockProject}
                onClose={mockOnClose}
            />
        );

        expect(screen.getByText('Invite Member')).toBeInTheDocument();
        expect(screen.getByText(/Test Project/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Send Invite' })).toBeInTheDocument();
    });

    it('calls onClose when Cancel is clicked', () => {
        render(
            <InviteMemberModal
                project={mockProject}
                onClose={mockOnClose}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(mockOnClose).toHaveBeenCalled();
    });
});
