import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { makeTask } from '@test';
import ProjectHeader from '@/features/projects/components/ProjectHeader';

function renderHeader(project = makeTask({ id: 'project-1', title: 'Project One' }), tasks = [makeTask({ id: 'task-1', status: 'not_started' })]) {
    return render(
        <MemoryRouter>
            <ProjectHeader project={project} tasks={tasks} />
        </MemoryRouter>,
    );
}

describe('ProjectHeader derived project state', () => {
    it('shows derived task state instead of the root lifecycle status', () => {
        renderHeader(
            makeTask({ id: 'project-1', title: 'Project One', status: 'launched', is_complete: false }),
            [makeTask({ id: 'task-1', status: 'not_started' })],
        );

        expect(screen.getByTestId('project-derived-state-badge')).toHaveTextContent('Not started');
        expect(screen.queryByText(/launched/i)).toBeNull();
    });

    it('keeps archive visible as a visibility state', () => {
        renderHeader(
            makeTask({ id: 'project-1', title: 'Project One', status: 'archived', is_complete: false }),
            [makeTask({ id: 'task-1', status: 'in_progress' })],
        );

        expect(screen.getByTestId('project-derived-state-badge')).toHaveTextContent('Archived');
    });

    it('can derive state from full hierarchy while keeping leaf tasks separate', () => {
        render(
            <MemoryRouter>
                <ProjectHeader
                    project={makeTask({ id: 'project-1', title: 'Project One', status: 'launched', is_complete: false })}
                    tasks={[]}
                    stateTasks={[
                        makeTask({ id: 'project-1', status: 'launched' }),
                        makeTask({ id: 'phase-1', parent_task_id: 'project-1', status: 'not_started' }),
                    ]}
                />
            </MemoryRouter>,
        );

        expect(screen.getByTestId('project-derived-state-badge')).toHaveTextContent('Not started');
        expect(screen.queryByText('No tasks')).toBeNull();
    });

    it('routes the back control to tasks instead of dashboard', () => {
        const { container } = renderHeader();

        expect(container.querySelector('a[href="/tasks"]')).not.toBeNull();
        expect(container.querySelector('a[href="/dashboard"]')).toBeNull();
    });
});
