import React from 'react';
import TaskResources from '../molecules/TaskResources';

const TaskDetailsView = ({ task, onAddChildTask, onEditTask, onDeleteTask, onTaskUpdated }) => {
  // Enhanced date formatter handling both YYYY-MM-DD and ISO timestamps
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';

    let date;
    // Check if it's a full ISO timestamp (contains 'T')
    if (dateStr.includes('T')) {
      date = new Date(dateStr);
    } else {
      // Handle YYYY-MM-DD (Manual dates) strictly as UTC to prevent shifts
      const [year, month, day] = dateStr.split('-');
      date = new Date(Date.UTC(year, month - 1, day));
    }

    if (isNaN(date.getTime())) return 'Invalid Date';

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: dateStr.includes('T') ? undefined : 'UTC', // Use local time for timestamps, UTC for dates
    });
  };

  // Determine hierarchy level
  const getTaskLevel = () => {
    if (!task.parent_task_id) return 0;
    return 1; // Simplified
  };

  const level = getTaskLevel();
  const canHaveChildren = level < 3;

  return (
    <div className="task-details px-2">
      {/* Actions */}
      <div className="detail-section">
        <div className="flex flex-wrap gap-3">
          {onEditTask && (
            <button
              type="button"
              onClick={() => onEditTask(task)}
              className="flex-1 inline-flex justify-center items-center rounded-md border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Edit Task
            </button>
          )}
          {onDeleteTask && (
            <button
              type="button"
              onClick={() => onDeleteTask(task)}
              className="flex-1 inline-flex justify-center items-center rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete Task
            </button>
          )}
        </div>
      </div>

      {/* Task Type Badge */}
      <div className="detail-section">
        <h3 className="detail-section-title text-slate-500 mb-1">Type</h3>
        <div>
          <span
            className={`task-type-badge inline-block ${task.origin === 'instance' ? 'instance' : 'template'}`}
          >
            {task.origin === 'instance' ? 'Project Task' : 'Template'}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="detail-section">
        <h3 className="detail-section-title text-slate-500 mb-1">Status</h3>
        <div className="status-badge-container">
          {task.is_complete ? (
            <span className="status-badge complete px-3 py-1.5 text-sm">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="mr-1.5"
              >
                <path d="M13.485 3.485a1 1 0 011.414 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L6 10.586l7.485-7.101z" />
              </svg>
              Complete
            </span>
          ) : (
            <span className="status-badge incomplete px-3 py-1.5 text-sm">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="mr-1.5"
              >
                <circle cx="8" cy="8" r="3" />
              </svg>
              Incomplete
            </span>
          )}
        </div>
      </div>

      <div className="h-px bg-slate-100 my-2"></div>

      {/* Description */}
      {task.description && (
        <div className="detail-section">
          <h3 className="detail-section-title text-slate-500 mb-1">Description</h3>
          <p className="detail-section-content text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
            {task.description}
          </p>
        </div>
      )}

      {/* Purpose */}
      {task.purpose && (
        <div className="detail-section">
          <h3 className="detail-section-title text-slate-500 mb-1">Purpose</h3>
          <p className="detail-section-content text-slate-700">{task.purpose}</p>
        </div>
      )}

      {/* Notes */}
      {task.notes && (
        <div className="detail-section">
          <h3 className="detail-section-title text-slate-500 mb-1">Notes</h3>
          <p className="detail-section-content text-slate-700">{task.notes}</p>
        </div>
      )}

      {/* Actions Text */}
      {task.actions && (
        <div className="detail-section">
          <h3 className="detail-section-title text-slate-500 mb-1">Actions</h3>
          <p className="detail-section-content text-slate-700">{task.actions}</p>
        </div>
      )}

      {/* Resources */}
      <div className="py-2">
        <TaskResources
          taskId={task.id}
          primaryResourceId={task.primary_resource_id}
          onUpdate={onTaskUpdated}
        />
      </div>

      <div className="h-px bg-slate-100 my-2"></div>

      {/* Dates */}
      <div className="detail-section">
        <h3 className="detail-section-title text-slate-500 mb-2">Dates</h3>
        <div className="date-info-grid gap-3">
          <div className="date-info-item bg-white border border-slate-200 shadow-sm">
            <span className="date-label">Start Date</span>
            <span className="date-value font-mono">{formatDate(task.start_date)}</span>
          </div>
          <div className="date-info-item bg-white border border-slate-200 shadow-sm">
            <span className="date-label">Due Date</span>
            <span className="date-value font-mono">{formatDate(task.due_date)}</span>
          </div>
          {task.duration_days && (
            <div className="date-info-item bg-white border border-slate-200 shadow-sm">
              <span className="date-label">Duration</span>
              <span className="date-value">{task.duration_days} days</span>
            </div>
          )}
        </div>
      </div>

      {/* Add Child Action */}
      {onAddChildTask && canHaveChildren && (
        <div className="detail-section mt-4">
          <button
            type="button"
            onClick={() => onAddChildTask(task)}
            className="btn-primary w-full py-3 text-base shadow-sm hover:shadow-md transition-all"
            aria-label={`Add child task to ${task.title}`}
          >
            + Add Child Task
          </button>
        </div>
      )}

      {/* Metadata */}
      <div className="detail-section detail-metadata mt-6 pt-4 border-t border-slate-100">
        <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-400">
          <div className="metadata-item">
            <span className="font-medium mr-2">Position:</span>
            <span>{task.position || 0}</span>
          </div>
          {task.days_from_start !== null && task.days_from_start !== undefined && (
            <div className="metadata-item">
              <span className="font-medium mr-2">Offset:</span>
              <span>{Number(task.days_from_start)} days</span>
            </div>
          )}
          <div className="metadata-item col-span-2">
            <span className="font-medium mr-2">Created:</span>
            <span>{formatDate(task.created_at)}</span>
          </div>
          {task.updated_at && (
            <div className="metadata-item col-span-2">
              <span className="font-medium mr-2">Updated:</span>
              <span>{formatDate(task.updated_at)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsView;
