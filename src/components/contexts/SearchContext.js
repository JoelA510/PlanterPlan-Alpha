// src/components/contexts/SearchContext.js
import React, { createContext, useContext, useState, useMemo } from 'react';
import { useTasks } from './TaskContext';
import { useAuth } from './AuthContext';

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const { instanceTasks, templateTasks } = useTasks();
  const { user } = useAuth();

  // Search state
  const [searchFilters, setSearchFilters] = useState({
    text: '',
    status: 'all', // all, complete, incomplete, overdue, due_today, due_week
    taskType: 'all', // all, my_tasks, created_by_me, assigned_to_me
    timeframe: 'all', // all, today, this_week, overdue, upcoming
    projectFilter: 'all', // all, specific_project_id
    includeTemplates: false
  });

  const [isSearchActive, setIsSearchActive] = useState(false);

  // Helper functions for filtering
  const isOverdue = (task) => {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && !task.is_complete;
  };

  const isDueToday = (task) => {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  };

  const isDueThisWeek = (task) => {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= weekFromNow;
  };

  const isCreatedByUser = (task) => {
    return task.creator === user?.id;
  };

  const isAssignedToUser = (task) => {
    // Check if user is assigned to this task
    if (Array.isArray(task.assigned_users)) {
      return task.assigned_users.includes(user?.id);
    }
    return task.task_lead === user?.id;
  };

  const matchesTextSearch = (task, searchText) => {
    if (!searchText) return true;
    
    const searchLower = searchText.toLowerCase();
    const searchFields = [
      task.title || '',
      task.description || '',
      task.purpose || '',
      ...(Array.isArray(task.actions) ? task.actions : []),
      ...(Array.isArray(task.resources) ? task.resources : [])
    ];

    return searchFields.some(field => 
      field.toLowerCase().includes(searchLower)
    );
  };

  // Main filtering logic
  const filteredTasks = useMemo(() => {
    let tasksToFilter = [...instanceTasks];
    
    // Include templates if requested
    if (searchFilters.includeTemplates) {
      tasksToFilter = [...tasksToFilter, ...templateTasks];
    }

    return tasksToFilter.filter(task => {
      // Text search
      if (!matchesTextSearch(task, searchFilters.text)) {
        return false;
      }

      // Status filters
      switch (searchFilters.status) {
        case 'complete':
          if (!task.is_complete) return false;
          break;
        case 'incomplete':
          if (task.is_complete) return false;
          break;
        case 'overdue':
          if (!isOverdue(task)) return false;
          break;
        case 'due_today':
          if (!isDueToday(task)) return false;
          break;
        case 'due_week':
          if (!isDueThisWeek(task)) return false;
          break;
      }

      // Task type filters
      switch (searchFilters.taskType) {
        case 'my_tasks':
          if (!isCreatedByUser(task) && !isAssignedToUser(task)) return false;
          break;
        case 'created_by_me':
          if (!isCreatedByUser(task)) return false;
          break;
        case 'assigned_to_me':
          if (!isAssignedToUser(task)) return false;
          break;
      }

      // Timeframe filters (additional to status)
      switch (searchFilters.timeframe) {
        case 'today':
          if (!isDueToday(task)) return false;
          break;
        case 'this_week':
          if (!isDueThisWeek(task)) return false;
          break;
        case 'overdue':
          if (!isOverdue(task)) return false;
          break;
        case 'upcoming':
          if (task.is_complete || isOverdue(task)) return false;
          break;
      }

      return true;
    });
  }, [instanceTasks, templateTasks, searchFilters, user?.id]);

  // Get active filter count for UI
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchFilters.text) count++;
    if (searchFilters.status !== 'all') count++;
    if (searchFilters.taskType !== 'all') count++;
    if (searchFilters.timeframe !== 'all') count++;
    if (searchFilters.includeTemplates) count++;
    return count;
  }, [searchFilters]);

  // Get active filters for display
  const activeFilters = useMemo(() => {
    const filters = [];
    
    if (searchFilters.text) {
      filters.push({
        type: 'text',
        label: `Text: "${searchFilters.text}"`,
        value: searchFilters.text
      });
    }
    
    if (searchFilters.status !== 'all') {
      const statusLabels = {
        complete: 'Complete',
        incomplete: 'Incomplete', 
        overdue: 'Overdue',
        due_today: 'Due Today',
        due_week: 'Due This Week'
      };
      filters.push({
        type: 'status',
        label: statusLabels[searchFilters.status],
        value: searchFilters.status
      });
    }

    if (searchFilters.taskType !== 'all') {
      const typeLabels = {
        my_tasks: 'My Tasks',
        created_by_me: 'Created by Me',
        assigned_to_me: 'Assigned to Me'
      };
      filters.push({
        type: 'taskType',
        label: typeLabels[searchFilters.taskType],
        value: searchFilters.taskType
      });
    }

    if (searchFilters.timeframe !== 'all') {
      const timeLabels = {
        today: 'Due Today',
        this_week: 'Due This Week',
        overdue: 'Overdue',
        upcoming: 'Upcoming'
      };
      filters.push({
        type: 'timeframe',
        label: timeLabels[searchFilters.timeframe],
        value: searchFilters.timeframe
      });
    }

    if (searchFilters.includeTemplates) {
      filters.push({
        type: 'includeTemplates',
        label: 'Include Templates',
        value: true
      });
    }

    return filters;
  }, [searchFilters]);

  // Filter update functions
  const updateFilter = (filterType, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setIsSearchActive(true);
  };

  const updateTextSearch = (text) => {
    updateFilter('text', text);
  };

  const removeFilter = (filterType) => {
    const resetValues = {
      text: '',
      status: 'all',
      taskType: 'all', 
      timeframe: 'all',
      includeTemplates: false
    };
    
    updateFilter(filterType, resetValues[filterType]);
    
    // If no filters remain, deactivate search
    const remainingFilters = { ...searchFilters, [filterType]: resetValues[filterType] };
    const hasActiveFilters = Object.entries(remainingFilters).some(([key, value]) => {
      return value !== '' && value !== 'all' && value !== false;
    });
    
    if (!hasActiveFilters) {
      setIsSearchActive(false);
    }
  };

  const clearAllFilters = () => {
    setSearchFilters({
      text: '',
      status: 'all',
      taskType: 'all',
      timeframe: 'all',
      projectFilter: 'all',
      includeTemplates: false
    });
    setIsSearchActive(false);
  };

  // Quick filter presets
  const applyQuickFilter = (preset) => {
    const presets = {
      'my_overdue': {
        taskType: 'my_tasks',
        status: 'overdue',
        text: '',
        timeframe: 'all',
        includeTemplates: false
      },
      'due_today': {
        status: 'due_today',
        taskType: 'all',
        text: '',
        timeframe: 'all',
        includeTemplates: false
      },
      'my_incomplete': {
        taskType: 'my_tasks',
        status: 'incomplete',
        text: '',
        timeframe: 'all',
        includeTemplates: false
      },
      'templates_only': {
        taskType: 'all',
        status: 'all',
        text: '',
        timeframe: 'all',
        includeTemplates: true
      }
    };

    if (presets[preset]) {
      setSearchFilters(prev => ({
        ...prev,
        ...presets[preset]
      }));
      setIsSearchActive(true);
    }
  };

  const contextValue = {
    // State
    searchFilters,
    filteredTasks,
    isSearchActive,
    activeFilterCount,
    activeFilters,
    
    // Actions
    updateFilter,
    updateTextSearch,
    removeFilter,
    clearAllFilters,
    applyQuickFilter,
    
    // Helpers
    isOverdue,
    isDueToday,
    isDueThisWeek
  };

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  );
};