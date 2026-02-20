import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TaskActions } from '@/features/tasks/components/TaskTree/TaskActions';
import { BrowserRouter } from 'react-router-dom';

const Wrapper = ({ children }) => (
    <BrowserRouter>
        {children}
    </BrowserRouter>
);

describe('XSS Prevention', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('TaskActions should sanitize dangerous HTML in title', () => {
        const dangerousTitle = '<img src=x onerror=alert("XSS") data-testid="exploit" />';
        const node = {
            id: 't1',
            title: dangerousTitle,
            status: 'todo',
            position: 0,
            is_complete: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        render(
            <Wrapper>
                <TaskActions
                    node={node}
                    onToggle={vi.fn()}
                    onAddSubtask={vi.fn()}
                    onDelete={vi.fn()}
                />
            </Wrapper>
        );

        // React normally escapes this as a string, preventing XSS injection.
        // If the component ever switches to dangerouslySetInnerHTML for rich text,
        // this test ensures the malicious tag is either stripped or escaped.
        expect(screen.queryByTestId('exploit')).not.toBeInTheDocument();

        // Verify the component at least processed the node and didn't crash
        expect(screen.getByText(dangerousTitle)).toBeInTheDocument();
    });
});
