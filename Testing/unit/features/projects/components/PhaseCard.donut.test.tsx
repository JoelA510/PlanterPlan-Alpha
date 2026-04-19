import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeTask } from '@test';
import PhaseCard from '@/features/projects/components/PhaseCard';

// Stub recharts' ResponsiveContainer so jsdom (zero-size) renders the children.
vi.mock('recharts', async () => {
    const actual = await vi.importActual<typeof import('recharts')>('recharts');
    return {
        ...actual,
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
            <div style={{ width: 64, height: 64 }}>{children}</div>
        ),
    };
});

describe('PhaseCard — checkpoint donut (Wave 29)', () => {
    it('renders the progress bar (not the donut) for date-kind projects', () => {
        const phase = makeTask({ id: 'ph1', title: 'Discovery', task_type: 'phase', parent_task_id: 'p1', position: 1 });
        const root = makeTask({ id: 'p1', title: 'Date Project', parent_task_id: null, settings: null });
        render(<PhaseCard phase={phase} tasks={[]} milestones={[]} rootTask={root} />);

        expect(screen.queryByTestId('phase-donut')).toBeNull();
        expect(screen.getByText(/progress/i)).toBeInTheDocument();
    });

    it('renders the donut for checkpoint-kind projects', () => {
        const phase = makeTask({ id: 'ph1', title: 'Discovery', task_type: 'phase', parent_task_id: 'p1', position: 1 });
        const root = makeTask({ id: 'p1', title: 'CP Project', parent_task_id: null, settings: { project_kind: 'checkpoint' } });
        render(<PhaseCard phase={phase} tasks={[]} milestones={[]} rootTask={root} />);

        expect(screen.getByTestId('phase-donut')).toBeInTheDocument();
    });

    it('shows "Locked" as the center label when the phase is_locked on a checkpoint project', () => {
        const phase = makeTask({
            id: 'ph2',
            title: 'Implementation',
            task_type: 'phase',
            parent_task_id: 'p1',
            position: 2,
            is_locked: true,
        });
        const root = makeTask({ id: 'p1', title: 'CP Project', parent_task_id: null, settings: { project_kind: 'checkpoint' } });
        render(<PhaseCard phase={phase} tasks={[]} milestones={[]} rootTask={root} />);

        const donut = screen.getByTestId('phase-donut');
        expect(donut).toHaveTextContent('Locked');
    });

    it('shows {progress}% as the center label when unlocked on a checkpoint project', () => {
        const phase = makeTask({ id: 'ph1', title: 'Discovery', task_type: 'phase', parent_task_id: 'p1', position: 1 });
        const root = makeTask({ id: 'p1', title: 'CP Project', parent_task_id: null, settings: { project_kind: 'checkpoint' } });
        render(<PhaseCard phase={phase} tasks={[]} milestones={[]} rootTask={root} />);

        const donut = screen.getByTestId('phase-donut');
        // 0/0 tasks → 0%
        expect(donut).toHaveTextContent('0%');
    });
});
