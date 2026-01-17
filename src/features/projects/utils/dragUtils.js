export function resolveDragAssign(active, over, tasks) {
    if (!over) return null;
    if (active.data.current?.type === 'User') {
        const userId = active.data.current.member.userId || active.data.current.member.id;
        const targetTaskId = over.id;

        const targetTask = tasks.find(t => t.id === targetTaskId);

        if (targetTask) {
            return { taskId: targetTaskId, userId };
        }
    }
    return null;
}
