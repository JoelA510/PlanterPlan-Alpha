import { TASK_STATUS } from '@app/constants/index';
import { useCallback } from 'react';

const getStatusStyle = (status) => {
    switch (status) {
        case TASK_STATUS.COMPLETED:
            return 'status-badge-complete';
        case TASK_STATUS.IN_PROGRESS:
            return 'status-badge-progress';
        case TASK_STATUS.BLOCKED:
            return 'status-badge-blocked';
        case TASK_STATUS.TODO:
        default:
            return 'status-badge-todo';
    }
};

export default function TaskStatusSelect({ status, taskId, onStatusChange }) {
    const handleChange = useCallback((e) => {
        e.stopPropagation();
        if (onStatusChange) onStatusChange(taskId, e.target.value);
    }, [onStatusChange, taskId]);

    return (
        <div className="relative group">
            <select
                className={`appearance-none cursor-pointer pl-4 pr-9 py-1.5 text-xs font-semibold rounded-full border transition-all ${getStatusStyle(status)} focus:ring-2 focus:ring-offset-1 focus:ring-brand-500 focus:outline-none`}
                value={status || TASK_STATUS.TODO}
                onClick={(e) => e.stopPropagation()}
                onChange={handleChange}
            >
                <option value={TASK_STATUS.TODO}>To Do</option>
                <option value={TASK_STATUS.IN_PROGRESS}>In Progress</option>
                <option value={TASK_STATUS.BLOCKED}>Blocked</option>
                <option value={TASK_STATUS.COMPLETED}>Complete</option>
            </select>
        </div>
    );
}
