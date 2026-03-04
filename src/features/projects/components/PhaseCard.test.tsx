
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PhaseCard from './PhaseCard';
import { TASK_STATUS } from '@/shared/constants';
import type { TaskRow } from '@/shared/db/app.types';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, whileHover: _h, whileTap: _t, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    },
}));

vi.mock('@/shared/ui/card', () => ({
    Card: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
        <div className={className} onClick={onClick} role="article">
            {children}
        </div>
    ),
}));

vi.mock('@/shared/ui/progress', () => ({
    Progress: ({ value, className }: { value: number; className?: string }) => (
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
                phase={mockPhase as TaskRow}
                tasks={mockTasks as TaskRow[]}
                milestones={mockMilestones as TaskRow[]}
                isActive={false}
            />
        );
        expect(screen.getByText('Phase 1')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows checkmark when complete', () => {
        const completeTasks = [
            { id: 't1', parent_task_id: 'm1', status: TASK_STATUS.COMPLETED }
        ];
        render(
            <PhaseCard
                phase={mockPhase as TaskRow}
                tasks={completeTasks as TaskRow[]}
                milestones={mockMilestones as TaskRow[]}
                isActive={false}
            />
        );
        expect(screen.getByTestId('check-circle')).toBeInTheDocument();
    });

    it('renders locked state when is_locked is true', () => {
        const lockedPhase = { ...mockPhase, is_locked: true };
        render(
            <PhaseCard
                phase={lockedPhase as TaskRow}
                tasks={[] as TaskRow[]}
                milestones={mockMilestones as TaskRow[]}
                isActive={false}
            />
        );

        const locks = screen.getAllByTestId('lock-icon');
        expect(locks).toHaveLength(2);
        expect(screen.getByRole('article')).toHaveClass('opacity-75');
        expect(screen.getByText(/Complete Phase 0 to unlock/i)).toBeInTheDocument();
    });
});
