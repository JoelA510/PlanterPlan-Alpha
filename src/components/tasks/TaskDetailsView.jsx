import React from 'react';

const TaskDetailsView = ({ task }) => {
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

  return (
    <div className="task-details">
      {/* Task Title */}
      <div className="detail-section">
        <h2 className="task-details-title">{task.title}</h2>
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

      {/* Metadata */}
      <div className="detail-section detail-metadata">
        <div className="metadata-item">
          <span className="metadata-label">Position:</span>
          <span className="metadata-value">{task.position || 0}</span>
        </div>
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