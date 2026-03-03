import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MobileAgenda from './MobileAgenda';
import { TASK_STATUS } from '@/shared/constants';
import { addDaysToDate } from '@/shared/lib/date-engine';

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateMock,
}));

vi.mock('@/shared/ui/card', () => ({
    Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

vi.mock('@/shared/ui/button', () => ({
    Button: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
        <button className={className} onClick={onClick}>{children}</button>
    ),
}));

vi.mock('lucide-react', () => ({
    Calendar: () => <span>CalendarIcon</span>,
    ChevronRight: () => <span>ChevronRight</span>,
}));

describe('MobileAgenda', () => {
    const today = new Date();
    const mockTasks = [
        { id: '1', title: 'Urgent Task', due_date: today.toISOString(), status: TASK_STATUS.TODO, root_id: 'p1' },
        { id: '2', title: 'Future Task', due_date: addDaysToDate(today, 2)?.toISOString() || '', status: TASK_STATUS.TODO, root_id: 'p1' },
        { id: '3', title: 'Completed Task', due_date: today.toISOString(), status: TASK_STATUS.COMPLETED, root_id: 'p1' }
    ];

    it('renders nothing if no tasks are due today', () => {
        const { container } = render(<MobileAgenda tasks={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders tasks due today', () => {
        render(<MobileAgenda tasks={mockTasks} />);
        expect(screen.getByText('Urgent Task')).toBeInTheDocument();
        expect(screen.getByText('Focused Today')).toBeInTheDocument();
    });

    it('does not render future or completed tasks', () => {
        render(<MobileAgenda tasks={mockTasks} />);
        expect(screen.queryByText('Future Task')).not.toBeInTheDocument();
        expect(screen.queryByText('Completed Task')).not.toBeInTheDocument();
    });
});
