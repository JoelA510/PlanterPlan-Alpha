import TaskResources from '@features/tasks/components/TaskResources';
import TaskDependencies from '@features/tasks/components/TaskDependencies';
import { formatDisplayDate } from '@shared/lib/date-engine';

import { useAuth } from '@app/contexts/AuthContext';

const TaskDetailsView = ({ task, onAddChildTask, onEditTask, onDeleteTask, onTaskUpdated, ...props }) => {
  const { user } = useAuth();

  if (!task) {
    return <div className="p-4 text-center text-muted-foreground">Select a task to view details</div>;
  }

  // Determine hierarchy level
  const getTaskLevel = () => {
    if (!task.parent_task_id) return 0;
    return 1;
  };

  const level = getTaskLevel();
  const canHaveChildren = level < 3;

  // Check valid subscription or override for local dev/admin if needed. 
  // For now, strict check on subscription_status.
  const hasLicense = user?.subscription_status === 'active' || user?.subscription_status === 'trialing';
  const isLocked = task.is_premium && !hasLicense;

  return (
    <div className="task-details px-4 pb-10">
      {' '}
      {/* Added padding bottom/x */}
      {/* 1. Header Actions - Made larger */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => {
            const subject = encodeURIComponent(`Task: ${task.title}`);
            const body = encodeURIComponent(
              `Status: ${task.status}\nDue: ${formatDisplayDate(task.due_date)}\n\n${task.description || ''}\n\nActions:\n${task.actions || ''}`
            );
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
          }}
          className="flex-1 py-3 px-4 bg-card border border-border text-card-foreground rounded-lg shadow-sm hover:bg-muted hover:shadow-md transition-all font-medium text-sm"
        >
          Email Task
        </button>
        {onEditTask && (
          <button
            type="button"
            onClick={() => onEditTask(task)}
            className="flex-1 py-3 px-4 bg-card border border-brand-200 dark:border-brand-900 text-brand-600 rounded-lg shadow-sm hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:shadow-md transition-all font-medium text-sm"
          >
            Edit Task
          </button>
        )}
        {onDeleteTask && (
          <button
            type="button"
            onClick={() => onDeleteTask(task)}
            className="flex-1 py-3 px-4 bg-card border border-rose-200 dark:border-rose-900 text-rose-600 rounded-lg shadow-sm hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:shadow-md transition-all font-medium text-sm"
          >
            Delete Task
          </button>
        )}
      </div>

      {/* 2. Meta Data Pills - Increased padding/size */}
      <div className="detail-section mb-6 mt-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Type
            </span>
            <span
              className={`task-type-badge inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border ${task.origin === 'instance' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-100 dark:border-brand-800' : 'bg-muted text-muted-foreground border-border'}`}
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

          {task.is_premium && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Access
              </span>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border bg-purple-50 text-purple-700 border-purple-100">
                Premium
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="h-px bg-slate-100 my-4"></div>

      {isLocked ? (
        <div className="p-8 text-center bg-muted/30 border-2 border-dashed border-border rounded-xl my-6">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h3 className="text-lg font-bold text-card-foreground mb-2">Premium Content Locked</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            This content is part of the Premium PlanterPlan curriculum. Upgrade to unlock full access to detailed guides, resources, and templates.
          </p>
          <button className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-sm transition-colors">
            Upgrade to Premium
          </button>
        </div>
      ) : (
        <>
          {/* 3. Main Content - Increased Line Height & Padding */}
          {
            task.description && (
              <div className="detail-section mb-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-foreground mb-2 uppercase tracking-wide">
                  Overview
                </h3>
                <p className="text-slate-600 dark:text-muted-foreground leading-relaxed text-sm">{task.description}</p>
              </div>
            )
          }
          {/* Purpose - The Why */}
          {
            task.purpose && (
              <div className="detail-section mb-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-foreground mb-2 uppercase tracking-wide">
                  Purpose (The Why)
                </h3>
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 text-slate-700 dark:text-indigo-200 leading-relaxed text-sm">
                  {task.purpose}
                </div>
              </div>
            )
          }
          {/* Actions - The What */}
          {
            task.actions && (
              <div className="detail-section mb-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-foreground mb-2 uppercase tracking-wide">
                  Action Steps (The What)
                </h3>
                <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-slate-700 dark:text-green-200 leading-relaxed text-sm whitespace-pre-wrap">
                  {task.actions}
                </div>
              </div>
            )
          }
          {
            task.notes && (
              <div className="detail-section mb-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-foreground mb-2 uppercase tracking-wide">Notes</h3>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 text-slate-700 dark:text-amber-200 text-sm italic">
                  {task.notes}
                </div>
              </div>
            )
          }
          {/* 4. Resources Section */}
          <div className="mb-6 pt-4 border-t border-slate-100">
            <TaskResources
              taskId={task.id}
              primaryResourceId={task.primary_resource_id}
              onUpdate={onTaskUpdated}
            />
          </div>
        </>
      )}

      <div className="h-px bg-slate-100 my-4"></div>
      {/* 5. Dates Grid */}
      <div className="detail-section mb-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-foreground mb-3 uppercase tracking-wide">Schedule</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-card border border-border rounded-lg shadow-sm flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Start Date
            </span>
            <span className="text-sm font-bold text-card-foreground tracking-tight">
              {formatDisplayDate(task.start_date)}
            </span>
          </div>
          <div className="p-4 bg-card border border-border rounded-lg shadow-sm flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Due Date
            </span>
            <span className="text-sm font-bold text-card-foreground tracking-tight">
              {formatDisplayDate(task.due_date)}
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-100 my-4"></div>

      {/* 5.5 Dependencies */}
      <TaskDependencies task={task} allProjectTasks={props.allProjectTasks || []} />

      {/* 5.6 Subtasks List */}
      {task.children && task.children.length > 0 && (
        <div className="detail-section mb-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-foreground mb-3 uppercase tracking-wide">Subtasks</h3>
          <div className="space-y-2">
            {task.children.map((child) => (
              <div key={child.id} className="p-3 bg-card border border-border rounded-lg shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${child.is_complete ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                  <span className={`text-sm font-medium ${child.is_complete ? 'text-muted-foreground line-through' : 'text-card-foreground'}`}>
                    {child.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Child Task Button */} {
        onAddChildTask && canHaveChildren && (
          <div className="detail-section mb-8">
            <button
              type="button"
              onClick={() => onAddChildTask(task)}
              className="w-full py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-md transition-all font-medium"
            >
              + Add Child Task
            </button>
          </div>
        )
      }
      {/* 7. Footer Metadata */}
      <div className="pt-6 border-t border-slate-100 text-xs text-slate-400 flex flex-col gap-1">
        <div className="flex justify-between">
          <span>Created</span>
          <span className="font-mono text-slate-500">{formatDisplayDate(task.created_at)}</span>
        </div>
        {task.updated_at && (
          <div className="flex justify-between">
            <span>Updated</span>
            <span className="font-mono text-slate-500">{formatDisplayDate(task.updated_at)}</span>
          </div>
        )}
        <div className="flex justify-between mt-2">
          <span>ID</span>
          <span className="font-mono opacity-50">{task.id.slice(0, 8)}...</span>
        </div>
      </div>
    </div >
  );
};

export default TaskDetailsView;
