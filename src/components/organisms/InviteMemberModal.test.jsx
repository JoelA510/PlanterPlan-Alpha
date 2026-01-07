import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InviteMemberModal from './InviteMemberModal';
import '@testing-library/jest-dom';

// Mock ReactDOM.createPortal to render children directly
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node) => node,
  };
});

describe('InviteMemberModal', () => {
  const mockProject = { id: 'test-project', title: 'Test Project' };
  const mockOnClose = vi.fn();

  it('renders correctly', () => {
    render(<InviteMemberModal project={mockProject} onClose={mockOnClose} />);

    expect(screen.getByText('Invite Member')).toBeInTheDocument();
    expect(screen.getByText(/Test Project/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Invite' })).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<InviteMemberModal project={mockProject} onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
