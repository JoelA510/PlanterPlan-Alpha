import { formatDisplayDate } from './date-engine';

/**
 * Exports project tasks to a CSV file.
 * @param {Object} project - Project metadata object (must have name).
 * @param {Array} tasks - List of task objects to export.
 */
export const exportProjectToCSV = (project, tasks) => {
    if (!tasks || tasks.length === 0) return;

    const headers = ['ID', 'Title', 'Type', 'Status', 'Start Date', 'Due Date', 'Description', 'Assignee'];

    const rows = tasks.map(task => {
        return [
            task.id,
            `"${(task.title || '').replace(/"/g, '""')}"`, // Escape quotes
            task.parent_task_id ? 'Subtask' : (task.root_id === task.id ? 'Project Root' : 'Phase/Milestone'),
            task.status,
            formatDisplayDate(task.start_date),
            formatDisplayDate(task.due_date),
            `"${(task.description || '').replace(/"/g, '""')}"`,
            task.assignee_id || 'Unassigned'
        ];
    });

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${project.name.replace(/\s+/g, '_')}_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
