import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PhaseCard from './PhaseCard';
import { TASK_STATUS } from '@app/constants/index';

// Mock dependencies
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
    },
}));

vi.mock('@shared/ui/card', () => ({
    Card: ({ children, className, onClick }) => (
        <div className={className} onClick={onClick} role="article">
            {children}
        </div>
    ),
}));

vi.mock('@shared/ui/progress', () => ({
    Progress: ({ value, className }) => (
        <div data-testid="progress" data-value={value} className={className} />
    ),
}));

vi.mock('lucide-react', () => ({
    ChevronRight: () => <span data-testid="chevron" />,
    CheckCircle2: () => <span data-testid="check-circle" />,
    Lock: () => <span data-testid="lock-icon" />,
}));

describe('PhaseCard', () => {
    const mockPhase = {
        id: 'phase-1',
        title: 'Phase 1',
        position: 1,
        description: 'Test Phase',
        is_locked: false,
    };

    const mockTasks = [
        { id: 't1', parent_task_id: 'm1', status: TASK_STATUS.COMPLETED },
        { id: 't2', parent_task_id: 'm1', status: TASK_STATUS.TODO },
    ];

    const mockMilestones = [
        { id: 'm1', parent_task_id: 'phase-1' }
    ];

    it('renders phase info correctly', () => {
        render(
            <PhaseCard
                phase={mockPhase}
                tasks={mockTasks}
                milestones={mockMilestones}
                isActive={false}
            />
        );
        expect(screen.getByText('Phase 1')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument(); // 1/2 tasks complete
    });

    it('shows checkmark when complete', () => {
        const completeTasks = [
            { id: 't1', parent_task_id: 'm1', status: TASK_STATUS.COMPLETED }
        ];
        render(
            <PhaseCard
                phase={mockPhase}
                tasks={completeTasks}
                milestones={mockMilestones}
                isActive={false}
            />
        );
        expect(screen.getByTestId('check-circle')).toBeInTheDocument();
    });

    it('renders locked state when is_locked is true', () => {
        const lockedPhase = { ...mockPhase, is_locked: true };
        render(
            <PhaseCard
                phase={lockedPhase}
                tasks={[]}
                milestones={mockMilestones}
                isActive={false}
            />
        );

        // Logic to be implemented:
        // 1. Should show lock icons (Icon in circle + Icon in text)
        // 2. Should be grey/disabled style
        const locks = screen.getAllByTestId('lock-icon');
        expect(locks).toHaveLength(2);
        expect(screen.getByRole('article')).toHaveClass('opacity-75');
        expect(screen.getByText(/Complete Phase 0 to unlock/i)).toBeInTheDocument();
    });
});
