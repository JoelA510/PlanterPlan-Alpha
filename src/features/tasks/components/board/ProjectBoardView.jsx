import { useMemo } from 'react';
import BoardColumn from './BoardColumn';
import { TASK_STATUS } from '@app/constants/index';

const COLUMNS = [
    { id: TASK_STATUS.TODO, title: 'To Do' },
    { id: TASK_STATUS.IN_PROGRESS, title: 'In Progress' },
    { id: TASK_STATUS.BLOCKED, title: 'Blocked' },
    { id: TASK_STATUS.COMPLETED, title: 'Complete' }
];

const ProjectBoardView = ({ project, childrenTasks, handleTaskClick }) => {
    // Categorize tasks
    const columns = useMemo(() => {
        const cols = {
            [TASK_STATUS.TODO]: [],
            [TASK_STATUS.IN_PROGRESS]: [],
            [TASK_STATUS.BLOCKED]: [],
            [TASK_STATUS.COMPLETED]: [],
        };

        childrenTasks.forEach(task => {
            const status = task.status || TASK_STATUS.TODO;
            if (cols[status]) {
                cols[status].push(task);
            } else {
                cols[TASK_STATUS.TODO].push(task); // Fallback
            }
        });

        // Sort by position
        Object.keys(cols).forEach(key => {
            cols[key].sort((a, b) => (a.position || 0) - (b.position || 0));
        });

        return cols;
    }, [childrenTasks]);

    return (
        <div className="flex h-full gap-4 overflow-x-auto pb-4 items-start px-2">
            {COLUMNS.map(col => (
                <BoardColumn
                    key={col.id}
                    id={col.id}
                    title={col.title}
                    tasks={columns[col.id]}
                    onTaskClick={handleTaskClick}
                    parentId={project.id}
                />
            ))}
        </div>
    );
};

export default ProjectBoardView;
