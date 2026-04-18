import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import MasterLibrarySearch from '@/features/library/components/MasterLibrarySearch';
import { useAuth } from '@/shared/contexts/AuthContext';
import { planter } from '@/shared/api/planterClient';
import type { TaskRow } from '@/shared/db/app.types';

interface StrategyFollowUpDialogProps {
    /** The strategy-template task that just flipped to `completed`. */
    task: TaskRow;
    /** Whether the dialog is open. Parent owns the state so it can track "seen". */
    open: boolean;
    /** Close callback. The parent should also mark the task as "prompt shown" so
     *  the dialog doesn't reopen on the next cache refetch. */
    onOpenChange: (open: boolean) => void;
    /**
     * Templates that are already present under the same project — forwarded to
     * `MasterLibrarySearch` so the combobox hides them (Wave 22 dedupe convention).
     */
    excludeTemplateIds?: readonly string[];
}

/**
 * Wave 24 — Strategy Template follow-up prompt. When an instance task flagged
 * `settings.is_strategy_template = true` transitions into `status = 'completed'`,
 * the parent (`TaskDetailsPanel` / `Project.tsx`) opens this dialog to let the
 * user pick one or more Master Library templates that will be cloned as
 * **sibling** tasks (same `parent_task_id` as the completed strategy task).
 *
 * Reuses `planter.entities.Task.clone` (which stamps `settings.spawnedFromTemplate`
 * on the cloned root for Wave 22 dedupe). Picks are non-blocking: the user may
 * select several in a row or dismiss without picking any.
 */
const StrategyFollowUpDialog = ({
    task,
    open,
    onOpenChange,
    excludeTemplateIds,
}: StrategyFollowUpDialogProps) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
    const [clonedCount, setClonedCount] = useState(0);

    const parentId = task.parent_task_id ?? null;
    const rootId = task.root_id ?? task.id;

    const handleSelect = async (selected: { id: string; title?: string }) => {
        if (!user?.id) {
            toast.error('Not signed in');
            return;
        }
        if (pendingTemplateId === selected.id) return;
        setPendingTemplateId(selected.id);
        try {
            const { error } = await planter.entities.Task.clone(
                selected.id,
                parentId,
                'instance',
                user.id,
            );
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['projectHierarchy', rootId] });
            setClonedCount((n) => n + 1);
            toast.success(`Added "${selected.title ?? 'Template'}" as a sibling task`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error('Failed to add template', { description: message });
        } finally {
            setPendingTemplateId(null);
        }
    };

    const excludeSet = useMemo(() => excludeTemplateIds ?? [], [excludeTemplateIds]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-lg"
                data-testid="strategy-followup-dialog"
            >
                <DialogHeader>
                    <DialogTitle>Add follow-up tasks</DialogTitle>
                    <DialogDescription>
                        You completed a strategy template. Pick one or more Master Library
                        templates to add as sibling tasks under the same parent.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <MasterLibrarySearch
                        onSelect={handleSelect}
                        mode="copy"
                        label="Search Master Library"
                        placeholder="Search by title or description…"
                        excludeTemplateIds={excludeSet}
                    />
                </div>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        data-testid="strategy-followup-done"
                    >
                        {clonedCount > 0 ? 'Done' : 'Skip'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default StrategyFollowUpDialog;
