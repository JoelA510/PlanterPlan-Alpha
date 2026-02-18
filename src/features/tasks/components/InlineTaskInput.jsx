import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import PropTypes from 'prop-types';

/**
 * Renders an inline input for creating a new task.
 * Supports auto-focus, commit on Enter, cancel on Esc.
 */
const InlineTaskInput = ({
    onCommit,
    onCancel,
    loading = false,
    level = 0
}) => {
    const [title, setTitle] = useState('');
    const inputRef = useRef(null);

    // Auto-focus on mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleKeyDown = (e) => {
        if (loading) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            if (title.trim()) {
                onCommit(title.trim());
                setTitle(''); // Optimistic clear, parent handles close
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    const handleBlur = (e) => {
        // Optional: Auto-cancel on blur if empty, or just stay open?
        // Let's auto-cancel if empty, otherwise keep it focused or commit.
        // For now, let's just cancel if the user clicks away without typing anything.
        if (!title.trim() && !loading) {
            onCancel();
        }
    };

    const indentWidth = (level + 1) * 20;

    return (
        <div
            className="flex items-center gap-3 py-3 px-4 mb-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 animate-in fade-in duration-200"
            style={{ marginLeft: `${indentWidth}px` }}
        >
            <div className="w-4 h-4 rounded-full border-2 border-brand-200 flex-shrink-0" />
            <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent border-none p-0 text-sm font-medium focus:ring-0 placeholder:text-muted-foreground/70"
                placeholder="Type a task name..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                disabled={loading}
            />
            {loading && <Loader2 className="w-3 H-3 animate-spin text-brand-500" />}
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider hidden sm:block">
                Enter to save • Esc to cancel
            </span>
        </div>
    );
};

InlineTaskInput.propTypes = {
    onCommit: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    loading: PropTypes.bool,
    level: PropTypes.number,
};

export default InlineTaskInput;
