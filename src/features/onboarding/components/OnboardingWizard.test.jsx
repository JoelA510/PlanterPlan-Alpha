import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OnboardingWizard from './OnboardingWizard';

// Mocks
vi.mock('@/shared/ui/dialog', () => ({
    Dialog: ({ open, children }) => open ? <div>{children}</div> : null,
    DialogContent: ({ children }) => <div>{children}</div>,
    DialogHeader: ({ children }) => <div>{children}</div>,
    DialogTitle: ({ children }) => <h2>{children}</h2>,
    DialogDescription: ({ children }) => <p>{children}</p>,
    DialogFooter: ({ children }) => <div>{children}</div>,
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
