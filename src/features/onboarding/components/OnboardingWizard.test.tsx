import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OnboardingWizard from './OnboardingWizard';

// Mocks
vi.mock('@/shared/ui/dialog', () => ({
    Dialog: ({ open, children }: { open: boolean, children: React.ReactNode }) => open ? <div>{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('OnboardingWizard', () => {
    it('does not render when open is false', () => {
        render(<OnboardingWizard open={false} />);
        expect(screen.queryByText('Welcome to PlanterPlan')).not.toBeInTheDocument();
    });

    it('renders first step when open is true', () => {
        render(<OnboardingWizard open={true} />);
        expect(screen.getByText('Welcome to PlanterPlan')).toBeInTheDocument();
        expect(screen.getByText(/Let's get your first/i)).toBeInTheDocument();
    });

    it('navigates to next step', () => {
        render(<OnboardingWizard open={true} />);

        // Fill required Project Name
        const input = screen.getByPlaceholderText(/Grace Community/i);
        fireEvent.change(input, { target: { value: 'My Test Church' } });

        const nextButton = screen.getByRole('button', { name: /next/i });
        fireEvent.click(nextButton);

        expect(screen.getByText(/When is the big day/i)).toBeInTheDocument();
    });
});
