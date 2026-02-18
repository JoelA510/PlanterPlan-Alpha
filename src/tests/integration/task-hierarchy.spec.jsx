import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskItem from '../../features/tasks/components/TaskItem';
import { buildTree } from '../../shared/lib/treeHelpers';
import { DndContext } from '@dnd-kit/core';

// Mock Dnd-kit hooks to avoid context errors during unit testing of UI
vi.mock('@dnd-kit/sortable', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useSortable: () => ({
            attributes: {},
            listeners: {},
            setNodeRef: vi.fn(),
            transform: null,
            transition: null,
            isDragging: false,
        }),
        SortableContext: ({ children }) => <div>{children}</div>,
    };
});

vi.mock('@dnd-kit/core', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useDroppable: () => ({
            setNodeRef: vi.fn(),
        }),
    };
});

describe('Task Hierarchy & Expansion', () => {

    describe('Logic: buildTree', () => {
        it('should correctly transform a flat list into a tree', () => {
            const flatTasks = [
                { id: '1', title: 'Root 1', parent_task_id: null, position: 0 },
                { id: '2', title: 'Child 1-1', parent_task_id: '1', position: 0 },
                { id: '3', title: 'Grandchild 1-1-1', parent_task_id: '2', position: 0 },
                { id: '4', title: 'Root 2', parent_task_id: null, position: 1 },
            ];

            // Assuming null is the root parentId context
            const tree = buildTree(flatTasks, null);

            expect(tree).toHaveLength(2); // Root 1, Root 2
            expect(tree[0].id).toBe('1');
            expect(tree[0].children).toHaveLength(1);
            expect(tree[0].children[0].id).toBe('2');
            expect(tree[0].children[0].children).toHaveLength(1);
            expect(tree[0].children[0].children[0].id).toBe('3');
            expect(tree[1].id).toBe('4');
        });

        it('should handle empty lists', () => {
            const tree = buildTree([], null);
            expect(tree).toHaveLength(0);
        });
    });

    describe('UI: TaskItem Rendering', () => {
        const mockOnToggleExpand = vi.fn();
        const mockOnTaskClick = vi.fn();

        const renderTaskItem = (task, props = {}) => {
            return render(
                <DndContext>
                    <TaskItem
                        task={task}
                        onToggleExpand={mockOnToggleExpand}
                        onTaskClick={mockOnTaskClick}
                        {...props}
                    />
                </DndContext>
            );
        };

        it('should NOT render children when collapsed (isExpanded: false)', () => {
            const task = {
                id: '1',
                title: 'Parent Task',
                children: [
                    { id: '2', title: 'Child Task', parent_task_id: '1' }
                ],
                isExpanded: false
            };

            renderTaskItem(task);

            expect(screen.getByText('Parent Task')).toBeInTheDocument();
            expect(screen.queryByText('Child Task')).not.toBeInTheDocument();
        });

        it('should render children when expanded (isExpanded: true)', () => {
            const task = {
                id: '1',
                title: 'Parent Task',
                children: [
                    { id: '2', title: 'Child Task', parent_task_id: '1' }
                ],
                isExpanded: true
            };

            renderTaskItem(task);

            expect(screen.getByText('Parent Task')).toBeInTheDocument();
            expect(screen.getByText('Child Task')).toBeInTheDocument();
        });

        it('should call onToggleExpand when chevron is clicked', () => {
            const task = {
                id: '1',
                title: 'Parent Task',
                children: [
                    { id: '2', title: 'Child Task', parent_task_id: '1' }
                ],
                isExpanded: false
            };

            renderTaskItem(task);

            // Find the chevron button (it has aria-label "Expand" or "Collapse")
            const chevron = screen.getByLabelText('Expand');
            fireEvent.click(chevron);

            expect(mockOnToggleExpand).toHaveBeenCalledWith(task, true);
        });

        it('should indicate indentation via margin-left style', () => {
            const task = {
                id: '2',
                title: 'Child Task',
                children: [],
                isExpanded: false
            };

            // Level 1 indentation
            const { container } = renderTaskItem(task, { level: 1 });
            // The first div should have margin-left: 20px (level 1 * 20)
            // Note: We need to find the element with the style.
            // The TaskItem component applies style={{ marginLeft: ... }} to the outer div.

            // We can query by text and look at the closest parent with that style, 
            // or just inspect the first child of the render result if it's the wrapper.
            // TaskItem returns a Fragment <>, so we look for the first div.

            const card = container.querySelector('.relative.flex.flex-col');
            expect(card).toHaveStyle({ marginLeft: '20px' });
        });
    });
});
