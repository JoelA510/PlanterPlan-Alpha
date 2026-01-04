import React from 'react';
import TaskResources from '../molecules/TaskResources';

const TaskDetailsView = ({ task, onAddChildTask, onEditTask, onDeleteTask, onTaskUpdated }) => {
  // FIX: Robust date formatter that handles ISO timestamps AND YYYY-MM-DD
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';

    let date;
    // If it contains a 'T', it's an ISO timestamp (e.g. created_at) -> Parse as Local
    // If it's short (YYYY-MM-DD), it's a manual date -> Parse as UTC to prevent "yesterday" bugs
    if (dateStr.includes('T')) {
      date = new Date(dateStr);
    } else {
      const [year, month, day] = dateStr.split('-');
      date = new Date(Date.UTC(year, month - 1, day));
    }

    if (isNaN(date.getTime())) return 'Invalid Date';

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: dateStr.includes('T') ? undefined : 'UTC',
    });
  };

  // Determine hierarchy level
  const getTaskLevel = () => {
    if (!task.parent_task_id) return 0;
    return 1;
  };

  const level = getTaskLevel();
  const canHaveChildren = level < 3;

  return (
    <div className="task-details px-4 pb-10">
      {' '}
      {/* Added padding bottom/x */}
      {/* 1. Header Actions - Made larger */}
      <div className="detail-section mb-6">
        <div className="flex gap-4">
          {onEditTask && (
            <button
              type="button"
              onClick={() => onEditTask(task)}
              className="flex-1 py-3 px-4 bg-white border border-blue-200 text-blue-600 rounded-lg shadow-sm hover:bg-blue-50 hover:shadow-md transition-all font-medium text-sm"
            >
              Edit Task
            </button>
          )}
          {onDeleteTask && (
            <button
              type="button"
              onClick={() => onDeleteTask(task)}
              className="flex-1 py-3 px-4 bg-white border border-red-200 text-red-600 rounded-lg shadow-sm hover:bg-red-50 hover:shadow-md transition-all font-medium text-sm"
            >
              Delete Task
            </button>
          )}
        </div>
      </div>
      {/* 2. Meta Data Pills - Increased padding/size */}
      <div className="detail-section mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Type
            </span>
            <span
              className={`task-type-badge inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border ${task.origin === 'instance' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}
            >
              {task.origin === 'instance' ? 'Project Task' : 'Template'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Status
            </span>
            {task.is_complete ? (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-100">
                <svg width="12" height="12" fill="currentColor" className="mr-1.5">
                  <path
                    d="M10 3L4.5 8.5L2 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Complete
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-100">
                <span className="w-2 h-2 rounded-full bg-amber-400 mr-2"></span>
                Incomplete
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="h-px bg-slate-100 my-4"></div>
      {/* 3. Main Content - Increased Line Height & Padding */}
      {task.description && (
        <div className="detail-section mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
            Description
          </h3>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 leading-7 text-sm">
            {task.description}
          </div>
        </div>
      )}
      {task.purpose && (
        <div className="detail-section mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">Purpose</h3>
          <p className="text-slate-600 leading-relaxed text-sm">{task.purpose}</p>
        </div>
      )}
      {task.notes && (
        <div className="detail-section mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">Notes</h3>
          <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-slate-700 text-sm italic">
            {task.notes}
          </div>
        </div>
      )}
      {task.actions && (
        <div className="detail-section mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">Actions</h3>
          <p className="text-slate-600 leading-relaxed text-sm">{task.actions}</p>
        </div>
      )}
      {/* 4. Resources Section */}
      <div className="mb-6">
        <TaskResources
          taskId={task.id}
          primaryResourceId={task.primary_resource_id}
          onUpdate={onTaskUpdated}
        />
      </div>
      <div className="h-px bg-slate-100 my-4"></div>
      {/* 5. Dates Grid */}
      <div className="detail-section mb-6">
        <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Schedule</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
            <span className="block text-xs text-slate-400 mb-1">Start Date</span>
            <span className="block text-sm font-semibold text-slate-800">
              {formatDate(task.start_date)}
            </span>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
            <span className="block text-xs text-slate-400 mb-1">Due Date</span>
            <span className="block text-sm font-semibold text-slate-800">
              {formatDate(task.due_date)}
            </span>
          </div>
        </div>
      </div>
      {/* 6. Child Task Button */}
      {onAddChildTask && canHaveChildren && (
        <div className="detail-section mb-8">
          <button
            type="button"
            onClick={() => onAddChildTask(task)}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all font-medium"
          >
            + Add Child Task
          </button>
        </div>
      )}
      {/* 7. Footer Metadata */}
      <div className="pt-6 border-t border-slate-100 text-xs text-slate-400 flex flex-col gap-1">
        <div className="flex justify-between">
          <span>Created</span>
          <span className="font-mono text-slate-500">{formatDate(task.created_at)}</span>
        </div>
        {task.updated_at && (
          <div className="flex justify-between">
            <span>Updated</span>
            <span className="font-mono text-slate-500">{formatDate(task.updated_at)}</span>
          </div>
        )}
        <div className="flex justify-between mt-2">
          <span>ID</span>
          <span className="font-mono opacity-50">{task.id.slice(0, 8)}...</span>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsView;
