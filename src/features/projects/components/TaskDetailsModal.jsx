import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import TaskDetailsView from '@/features/tasks/components/TaskDetailsView';

export default function TaskDetailsModal({
    task,
    isOpen,
    onClose,
    onAddChildTask,
    onEditTask,
    onDeleteTask,
    onTaskUpdated,
    allProjectTasks = [],
    canEdit = true
}) {
    if (!task) return null;

    // Ensure we have the latest task data (including children) from the Live Live list
    const freshTask = allProjectTasks.find(t => t.id === task.id) || task;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0 bg-card text-card-foreground">
                <DialogHeader className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
                    <DialogTitle className="text-lg font-bold text-card-foreground leading-snug pr-8">
                        {freshTask.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="pt-2">
                    <TaskDetailsView
                        task={freshTask}
                        onAddChildTask={onAddChildTask}
                        onEditTask={onEditTask}
                        onDeleteTask={onDeleteTask}
                        onTaskUpdated={onTaskUpdated}
                        allProjectTasks={allProjectTasks} // Pass through for dependencies
                        canEdit={canEdit}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
