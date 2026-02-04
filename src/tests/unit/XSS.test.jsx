
import { render, screen } from '@testing-library/react';
import TaskItem from '../../features/tasks/components/TaskItem';
import { vi, describe, it, expect } from 'vitest';

// Mock dependencies
vi.mock('@dnd-kit/sortable', () => ({
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        transition: null,
    }),
    SortableContext: ({ children }) => <div>{children}</div>,
    verticalListSortingStrategy: {},
}));

vi.mock('@dnd-kit/core', () => ({
    useDroppable: () => ({ setNodeRef: vi.fn() }),
}));

describe('XSS Prevention', () => {
    it('should sanitize task titles', () => {
        const maliciousTask = {
            id: '1',
            title: 'Safe Title <script>alert("xss")</script>',
            status: 'todo',
        };

        render(<TaskItem task={maliciousTask} level={0} />);

        // Check if script tag is removed from DOM
        const titleElement = screen.getByText(/Safe Title/);
        expect(titleElement.innerHTML).not.toContain('<script>');
        expect(titleElement.innerHTML).toContain('Safe Title');
    });

    it('should allow safe HTML', () => {
        const richTask = {
            id: '2',
            title: '<b>Bold Task</b>',
            status: 'todo',
        };

        render(<TaskItem task={richTask} level={0} />);

        // Should verify it rendered as HMTL bold tag, not text "&lt;b&gt;"
        const boldElement = screen.getByText('Bold Task');
        expect(boldElement.tagName).toBe('B');
    });
});
