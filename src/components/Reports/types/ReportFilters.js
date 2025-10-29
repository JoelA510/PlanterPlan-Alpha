import React, { useState, useMemo } from 'react';
import { useTasks } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';

const ReportFilters = ({ 
  filters, 
  onFiltersChange, 
  availableProjects = [],
  disabled = false 
}) => {
  const { user } = useAuth();
  const { instanceTasks } = useTasks();
  const [isExpanded, setIsExpanded] = useState(false);

  // Get unique task creators for filtering
  const availableCreators = useMemo(() => {
    const creators = new Map();
    instanceTasks.forEach(task => {
      if (task.creator && !creators.has(task.creator)) {
        creators.set(task.creator, {
          id: task.creator,
          name: task.creator === user?.id ? 'Me' : `User ${task.creator.slice(0, 8)}...`
        });
      }
    });
    return Array.from(creators.values());
  }, [instanceTasks, user?.id]);

  // Get unique assigned users
  const availableAssignees = useMemo(() => {
    const assignees = new Map();
    instanceTasks.forEach(task => {
      if (task.assigned_users && Array.isArray(task.assigned_users)) {
        task.assigned_users.forEach(userId => {
          if (!assignees.has(userId)) {
            assignees.set(userId, {
              id: userId,
              name: userId === user?.id ? 'Me' : `User ${userId.slice(0, 8)}...`
            });
          }
        });
      }
    });
    return Array.from(assignees.values());
  }, [instanceTasks, user?.id]);

  // Get date range options
  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'last_3_months', label: 'Last 3 Months' },
    { value: 'last_6_months', label: 'Last 6 Months' },
    { value: 'last_year', label: 'Last Year' },
    { value: 'this_year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Task status options
  const statusOptions = [
    { value: 'all', label: 'All Tasks' },
    { value: 'completed', label: 'Completed Only' },
    { value: 'incomplete', label: 'Incomplete Only' },
    { value: 'overdue', label: 'Overdue Only' }
  ];

  // Handle filter changes
  const handleFilterChange = (filterKey, value) => {
    const newFilters = {
      ...filters,
      [filterKey]: value
    };
    onFiltersChange(newFilters);
  };

  // Handle multiple selection filters (like tags)
  const handleMultiSelectChange = (filterKey, value, checked) => {
    const currentValues = filters[filterKey] || [];
    let newValues;
    
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(v => v !== value);
    }
    
    handleFilterChange(filterKey, newValues);
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({
      projects: ['all'],
      status: 'all',
      dateRange: 'all',
      createdBy: 'all',
      assignedTo: 'all',
      priority: 'all',
      tags: [],
      customStartDate: '',
      customEndDate: '',
      includeSubtasks: true,
      groupBy: 'project'
    });
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.projects && !filters.projects.includes('all') && filters.projects.length > 0) count++;
    if (filters.status !== 'all') count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.createdBy !== 'all') count++;
    if (filters.assignedTo !== 'all') count++;
    if (filters.priority !== 'all') count++;
    if (filters.tags && filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  // Get available tags from tasks
  const availableTags = useMemo(() => {
    const tags = new Set();
    instanceTasks.forEach(task => {
      if (task.tags && Array.isArray(task.tags)) {
        task.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [instanceTasks]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFilterCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              disabled={disabled}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Clear all
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={disabled}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title={isExpanded ? 'Collapse filters' : 'Expand filters'}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quick Filters (Always Visible) */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Project Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              value={filters.projects?.[0] || 'all'}
              onChange={(e) => handleFilterChange('projects', e.target.value === 'all' ? ['all'] : [e.target.value])}
              disabled={disabled}
              className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="all">All Projects</option>
              {availableProjects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              disabled={disabled}
              className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Time Period
            </label>
            <select
              value={filters.dateRange || 'all'}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              disabled={disabled}
              className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Filters (Expandable) */}
      {isExpanded && (
        <div className="px-4 py-4 space-y-4">
          {/* Custom Date Range */}
          {filters.dateRange === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-gray-50 rounded-md">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.customStartDate || ''}
                  onChange={(e) => handleFilterChange('customStartDate', e.target.value)}
                  disabled={disabled}
                  className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.customEndDate || ''}
                  onChange={(e) => handleFilterChange('customEndDate', e.target.value)}
                  disabled={disabled}
                  className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
          )}

          {/* People Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Created By
              </label>
              <select
                value={filters.createdBy || 'all'}
                onChange={(e) => handleFilterChange('createdBy', e.target.value)}
                disabled={disabled}
                className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="all">All Creators</option>
                {availableCreators.map(creator => (
                  <option key={creator.id} value={creator.id}>
                    {creator.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Assigned To
              </label>
              <select
                value={filters.assignedTo || 'all'}
                onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                disabled={disabled}
                className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="all">All Assignees</option>
                {availableAssignees.map(assignee => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableTags.map(tag => (
                  <label key={tag} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.tags?.includes(tag) || false}
                      onChange={(e) => handleMultiSelectChange('tags', tag, e.target.checked)}
                      disabled={disabled}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">{tag}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Display Options */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Display Options
            </label>
            <div className="space-y-2">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={filters.includeSubtasks !== false}
                  onChange={(e) => handleFilterChange('includeSubtasks', e.target.checked)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Include subtasks in results</span>
              </label>
            </div>
          </div>

          {/* Group By Options */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Group Results By
            </label>
            <select
              value={filters.groupBy || 'project'}
              onChange={(e) => handleFilterChange('groupBy', e.target.value)}
              disabled={disabled}
              className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="project">Project</option>
              <option value="status">Status</option>
              <option value="assignee">Assignee</option>
              <option value="date">Date</option>
              <option value="none">No Grouping</option>
            </select>
          </div>
        </div>
      )}

      {/* Filter Summary */}
      {activeFilterCount > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-blue-700 font-medium">Active filters:</span>
            {filters.projects && !filters.projects.includes('all') && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                Projects: {filters.projects.length}
                <button
                  onClick={() => handleFilterChange('projects', ['all'])}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                Status: {statusOptions.find(opt => opt.value === filters.status)?.label}
                <button
                  onClick={() => handleFilterChange('status', 'all')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.tags && filters.tags.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                Tags: {filters.tags.length}
                <button
                  onClick={() => handleFilterChange('tags', [])}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportFilters;