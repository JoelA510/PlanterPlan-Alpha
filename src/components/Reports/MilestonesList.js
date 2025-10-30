import React, { useState, useMemo, useCallback } from 'react';
import { useTasks } from '../contexts/TaskContext';
import { formatDisplayDate } from '../../utils/taskUtils';

// Helper function to find the root project for a task
const findRootProject = (taskId, instanceTasks) => {
  const taskMap = new Map(instanceTasks.map(t => [t.id, t]));

  const findRoot = (currentTaskId) => {
    const task = taskMap.get(currentTaskId);
    if (!task || !task.parent_task_id) {
      return task;
    }
    return findRoot(task.parent_task_id);
  };

  return findRoot(taskId);
};

// Helper function to get task hierarchy path
const getTaskPath = (taskId, instanceTasks) => {
  const taskMap = new Map(instanceTasks.map(t => [t.id, t]));

  const findPath = (currentTaskId) => {
    const task = taskMap.get(currentTaskId);
    if (!task) {
      return [];
    }
    if (!task.parent_task_id) {
      return [task];
    }
    return [...findPath(task.parent_task_id), task];
  };

  return findPath(taskId);
};

const MilestonesList = ({ 
  tasks = [], 
  type = 'completed', // 'completed', 'overdue', 'upcoming'
  emptyMessage = 'No milestones found',
  showProjectNames = true,
  maxHeight = '400px'
}) => {
  const { instanceTasks } = useTasks();
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [sortBy, setSortBy] = useState('date'); // 'date', 'title', 'project'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc', 'desc'

  const memoizedFindRootProject = useCallback((taskId) => findRootProject(taskId, instanceTasks), [instanceTasks]);
  const memoizedGetTaskPath = useCallback((taskId) => getTaskPath(taskId, instanceTasks), [instanceTasks]);

  // Sort tasks based on selected criteria
  const sortedTasks = useMemo(() => {
    const tasksWithMetadata = tasks.map(task => {
      const rootProject = memoizedFindRootProject(task.id);
      const taskPath = memoizedGetTaskPath(task.id);
      
      return {
        ...task,
        rootProject,
        taskPath,
        sortableDate: type === 'completed' ? task.last_modified : task.due_date
      };
    });

    return tasksWithMetadata.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          const dateA = new Date(a.sortableDate || 0);
          const dateB = new Date(b.sortableDate || 0);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'project':
          const projectA = a.rootProject?.title || '';
          const projectB = b.rootProject?.title || '';
          comparison = projectA.localeCompare(projectB);
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [tasks, sortBy, sortDirection, type, memoizedFindRootProject, memoizedGetTaskPath]);

  // Toggle task expansion
  const toggleTaskExpansion = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // Handle sort change
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDirection('desc');
    }
  };

  // Get status icon based on type
  const getStatusIcon = () => {
    switch (type) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'overdue':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'upcoming':
        return (
          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Get date label based on type
  const getDateLabel = () => {
    switch (type) {
      case 'completed':
        return 'Completed';
      case 'overdue':
        return 'Due Date';
      case 'upcoming':
        return 'Due Date';
      default:
        return 'Date';
    }
  };

  // Render sort button
  const SortButton = ({ field, label, className = "" }) => (
    <button
      onClick={() => handleSortChange(field)}
      className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-gray-100 transition-colors ${className}`}
      title={`Sort by ${label}`}
    >
      <span>{label}</span>
      {sortBy === field && (
        <svg 
          className={`w-3 h-3 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-400 mb-2">
          {getStatusIcon()}
        </div>
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sort Controls */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Sort by:</span>
          <div className="flex items-center gap-1">
            <SortButton field="date" label={getDateLabel()} />
            <SortButton field="title" label="Title" />
            {showProjectNames && <SortButton field="project" label="Project" />}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {tasks.length} {tasks.length === 1 ? 'milestone' : 'milestones'}
        </div>
      </div>

      {/* Tasks List */}
      <div 
        className="flex-1 overflow-y-auto"
        style={{ maxHeight }}
      >
        <div className="divide-y divide-gray-100">
          {sortedTasks.map((task, index) => {
            const isExpanded = expandedTasks.has(task.id);
            const hasDescription = task.description && task.description.trim();
            const hasActions = task.actions && Array.isArray(task.actions) && task.actions.length > 0;
            const hasResources = task.resources && Array.isArray(task.resources) && task.resources.length > 0;
            const canExpand = hasDescription || hasActions || hasResources;

            return (
              <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                {/* Main Task Info */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Task Title and Project */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {task.title || 'Untitled Task'}
                        </h4>
                        
                        {/* Project Hierarchy Path */}
                        {showProjectNames && task.taskPath && task.taskPath.length > 1 && (
                          <div className="mt-1">
                            <div className="flex items-center text-xs text-gray-500 truncate">
                              {task.taskPath.slice(0, -1).map((pathTask, pathIndex) => (
                                <React.Fragment key={pathTask.id}>
                                  <span className="truncate">{pathTask.title || 'Untitled'}</span>
                                  {pathIndex < task.taskPath.length - 2 && (
                                    <svg className="w-3 h-3 mx-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Expand Button */}
                      {canExpand && (
                        <button
                          onClick={() => toggleTaskExpansion(task.id)}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          <svg 
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Date Information */}
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        {getDateLabel()}: {formatDisplayDate(task.sortableDate)}
                      </span>
                      {task.duration_days && (
                        <span>
                          Duration: {task.duration_days} day{task.duration_days !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                        {/* Purpose */}
                        {task.purpose && (
                          <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">Purpose</div>
                            <div className="text-xs text-gray-600">{task.purpose}</div>
                          </div>
                        )}

                        {/* Description */}
                        {hasDescription && (
                          <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">Description</div>
                            <div className="text-xs text-gray-600 whitespace-pre-wrap">{task.description}</div>
                          </div>
                        )}

                        {/* Actions */}
                        {hasActions && (
                          <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">Actions</div>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {task.actions.map((action, actionIndex) => (
                                <li key={actionIndex} className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Resources */}
                        {hasResources && (
                          <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">Resources</div>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {task.resources.map((resource, resourceIndex) => (
                                <li key={resourceIndex} className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>{resource}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MilestonesList;