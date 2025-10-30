import React from 'react';

const TaskDetailsView = ({ task, onAddChildTask, onEditTask, onDeleteTask }) => {
  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Determine hierarchy level and if can have children
  // Projects(0) > Phases(1) > Milestones(2) > Tasks(3) > Subtasks(4)
  const getTaskLevel = () => {
    if (!task.parent_task_id) return 0; // Project
    // We'd need to traverse up to determine exact level
    // For now, assume based on having children
    return 1; // Simplified
  };

  const level = getTaskLevel();
  const canHaveChildren = level < 3;

  return (
    <div className="task-details">
      {/* Actions */}
      <div className="detail-section">
        <div className="flex flex-wrap gap-2">
          {onEditTask && (
            <button
              type="button"
              onClick={() => onEditTask(task)}
              className="inline-flex items-center rounded-md border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Edit Task
            </button>
          )}
          {onDeleteTask && (
            <button
              type="button"
              onClick={() => onDeleteTask(task)}
              className="inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete Task
            </button>
          )}
        </div>
      </div>

      {/* Task Type Badge */}
      <div className="detail-section">
        <h3 className="detail-section-title">Type</h3>
        <span className={`task-type-badge ${task.origin === 'instance' ? 'instance' : 'template'}`}>
          {task.origin === 'instance' ? 'Project Task' : 'Template'}
        </span>
      </div>

      {/* Status */}
      <div className="detail-section">
        <h3 className="detail-section-title">Status</h3>
        <div className="status-badge-container">
          {task.is_complete ? (
            <span className="status-badge complete">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.485 3.485a1 1 0 011.414 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L6 10.586l7.485-7.101z"/>
              </svg>
              Complete
            </span>
          ) : (
            <span className="status-badge incomplete">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="3"/>
              </svg>
              Incomplete
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div className="detail-section">
          <h3 className="detail-section-title">Description</h3>
          <p className="detail-section-content">{task.description}</p>
        </div>
      )}

      {/* Purpose */}
      {task.purpose && (
        <div className="detail-section">
          <h3 className="detail-section-title">Purpose</h3>
          <p className="detail-section-content">{task.purpose}</p>
        </div>
      )}

      {/* Notes */}
      {task.notes && (
        <div className="detail-section">
          <h3 className="detail-section-title">Notes</h3>
          <p className="detail-section-content">{task.notes}</p>
        </div>
      )}

      {/* Actions */}
      {task.actions && (
        <div className="detail-section">
          <h3 className="detail-section-title">Actions</h3>
          <p className="detail-section-content">{task.actions}</p>
        </div>
      )}

      {/* Resources */}
      {task.resources && (
        <div className="detail-section">
          <h3 className="detail-section-title">Resources</h3>
          <p className="detail-section-content">{task.resources}</p>
        </div>
      )}

      {/* Dates */}
      <div className="detail-section">
        <h3 className="detail-section-title">Dates</h3>
        <div className="date-info-grid">
          <div className="date-info-item">
            <span className="date-label">Start Date:</span>
            <span className="date-value">{formatDate(task.start_date)}</span>
          </div>
          <div className="date-info-item">
            <span className="date-label">Due Date:</span>
            <span className="date-value">{formatDate(task.due_date)}</span>
          </div>
          {task.duration_days && (
            <div className="date-info-item">
              <span className="date-label">Duration:</span>
              <span className="date-value">{task.duration_days} days</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {onAddChildTask && canHaveChildren && (
        <div className="detail-section">
          <button
            type="button"
            onClick={() => onAddChildTask(task)}
            className="btn-primary w-full"
            aria-label={`Add child task to ${task.title}`}
          >
            Add Child Task
          </button>
        </div>
      )}

      {/* Metadata */}
      <div className="detail-section detail-metadata">
        <div className="metadata-item">
          <span className="metadata-label">Position:</span>
          <span className="metadata-value">{task.position || 0}</span>
        </div>
        {task.days_from_start !== null && task.days_from_start !== undefined && (
          <div className="metadata-item">
            <span className="metadata-label">Days from start:</span>
            <span className="metadata-value">{Number(task.days_from_start)}</span>
          </div>
        )}
        <div className="metadata-item">
          <span className="metadata-label">Created:</span>
          <span className="metadata-value">{formatDate(task.created_at)}</span>
        </div>
        {task.updated_at && task.updated_at !== task.created_at && (
          <div className="metadata-item">
            <span className="metadata-label">Updated:</span>
            <span className="metadata-value">{formatDate(task.updated_at)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetailsView;
