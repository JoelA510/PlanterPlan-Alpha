import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProjectHeader from '@features/projects/components/ProjectHeader';
import { resolveDragAssign } from '@features/projects/utils/dragUtils';
import { DndContext } from '@dnd-kit/core';

// Mock DraggableAvatar logic (dnd-kit)
vi.mock('@dnd-kit/core', async () => {
    const actual = await vi.importActual('@dnd-kit/core');
    return {
        ...actual,
        useDraggable: () => ({
            attributes: {},
            listeners: {},
            setNodeRef: vi.fn(),
            transform: null,
            isDragging: false
        })
    };
});

describe('Drag To Assign', () => {
    const mockMember = { id: 'u1', first_name: 'John', last_name: 'Doe' };
    const mockProject = { id: 'p1', name: 'Test Proj', status: 'planning', template: 'launch_large' };

    describe('Components', () => {
        it('ProjectHeader renders draggable avatars', () => {
            render(
                <MemoryRouter>
                    <DndContext>
                        <ProjectHeader
                            project={mockProject}
                            teamMembers={[mockMember]}
                        />
                    </DndContext>
                </MemoryRouter>
            );
            expect(screen.getByText('JD')).toBeInTheDocument();
            expect(screen.getByTitle('Drag to assign John Doe')).toBeInTheDocument();
        });
    });

    describe('Logic (resolveDragAssign)', () => {
        const tasks = [{ id: 't1', title: 'Task 1' }];

        it('returns assignment when dropping User on known Task', () => {
            const active = { data: { current: { type: 'User', member: { id: 'u1' } } } };
            const over = { id: 't1' };

            const result = resolveDragAssign(active, over, tasks);
            expect(result).toEqual({ taskId: 't1', userId: 'u1' });
        });

        it('returns null if over is null', () => {
            const result = resolveDragAssign({}, null, tasks);
            expect(result).toBeNull();
        });

        it('returns null if active is not User', () => {
            const active = { data: { current: { type: 'Task' } } };
            const over = { id: 't1' };
            expect(resolveDragAssign(active, over, tasks)).toBeNull();
        });

        it('returns null if target is not a valid task', () => {
            const active = { data: { current: { type: 'User', member: { id: 'u1' } } } };
            const over = { id: 'invalid-task' };
            expect(resolveDragAssign(active, over, tasks)).toBeNull();
        });
    });
});
