// src/hooks/useTasksByDateRange.js
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTasks } from '../contexts/TaskContext';

/**
 * Custom hook for filtering tasks by various date ranges and criteria
 * Provides flexible date-based task filtering with caching and performance optimizations
 */
export const useTasksByDateRange = (dateRange = {}) => {
  const { instanceTasks, memberProjectTasks, loading: tasksLoading } = useTasks();
  
  const [processingState, setProcessingState] = useState({
    isProcessing: false,
    lastProcessedRange: null,
    cacheKey: ''
  });

  // Combine all available tasks
  const allTasks = useMemo(() => {
    return [...instanceTasks, ...memberProjectTasks];
  }, [instanceTasks, memberProjectTasks]);

  // Helper function to normalize date to start of day
  const normalizeDate = useCallback((date) => {
    if (!date) return null;
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }, []);

  // Helper function to normalize date to end of day
  const normalizeDateEnd = useCallback((date) => {
    if (!date) return null;
    const normalized = new Date(date);
    normalized.setHours(23, 59, 59, 999);
    return normalized;
  }, []);

  // Helper function to check if a date falls within a range
  const isDateInRange = useCallback((dateString, startDate, endDate) => {
    if (!dateString) return false;
    
    try {
      const date = new Date(dateString);
      const normalizedDate = normalizeDate(date);
      
      if (startDate && normalizedDate < normalizeDate(startDate)) {
        return false;
      }
      
      if (endDate && normalizedDate > normalizeDateEnd(endDate)) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('Invalid date string in range check:', dateString);
      return false;
    }
  }, [normalizeDate, normalizeDateEnd]);

  // Calculate date boundaries based on range type
  const calculateDateBoundaries = useCallback((range) => {
    const now = new Date();
    let startDate = null;
    let endDate = null;

    switch (range.type) {
      case 'today':
        startDate = normalizeDate(now);
        endDate = normalizeDateEnd(now);
        break;

      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = normalizeDate(yesterday);
        endDate = normalizeDateEnd(yesterday);
        break;

      case 'this_week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startDate = normalizeDate(startOfWeek);
        endDate = normalizeDateEnd(now);
        break;

      case 'last_week':
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setDate(now.getDate() - now.getDay() - 1); // Last Saturday
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // Last Sunday
        startDate = normalizeDate(lastWeekStart);
        endDate = normalizeDateEnd(lastWeekEnd);
        break;

      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = normalizeDateEnd(now);
        break;

      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = normalizeDate(lastMonth);
        endDate = normalizeDateEnd(lastMonthEnd);
        break;

      case 'this_quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        startDate = normalizeDate(quarterStart);
        endDate = normalizeDateEnd(now);
        break;

      case 'last_quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3; // Oct-Dec if negative
        const lastQuarterStart = new Date(lastQuarterYear, lastQuarterMonth, 1);
        const lastQuarterEnd = new Date(lastQuarterYear, lastQuarterMonth + 3, 0);
        startDate = normalizeDate(lastQuarterStart);
        endDate = normalizeDateEnd(lastQuarterEnd);
        break;

      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = normalizeDateEnd(now);
        break;

      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;

      case 'last_30_days':
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        startDate = normalizeDate(thirtyDaysAgo);
        endDate = normalizeDateEnd(now);
        break;

      case 'last_60_days':
        const sixtyDaysAgo = new Date(now);
        sixtyDaysAgo.setDate(now.getDate() - 60);
        startDate = normalizeDate(sixtyDaysAgo);
        endDate = normalizeDateEnd(now);
        break;

      case 'last_90_days':
        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(now.getDate() - 90);
        startDate = normalizeDate(ninetyDaysAgo);
        endDate = normalizeDateEnd(now);
        break;

      case 'next_7_days':
        const sevenDaysFromNow = new Date(now);
        sevenDaysFromNow.setDate(now.getDate() + 7);
        startDate = normalizeDate(now);
        endDate = normalizeDateEnd(sevenDaysFromNow);
        break;

      case 'next_30_days':
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(now.getDate() + 30);
        startDate = normalizeDate(now);
        endDate = normalizeDateEnd(thirtyDaysFromNow);
        break;

      case 'custom':
        if (range.startDate) {
          startDate = normalizeDate(new Date(range.startDate));
        }
        if (range.endDate) {
          endDate = normalizeDateEnd(new Date(range.endDate));
        }
        break;

      case 'specific_month':
        if (range.month !== undefined && range.year !== undefined) {
          startDate = new Date(range.year, range.month, 1);
          endDate = new Date(range.year, range.month + 1, 0, 23, 59, 59, 999);
        }
        break;

      case 'specific_year':
        if (range.year !== undefined) {
          startDate = new Date(range.year, 0, 1);
          endDate = new Date(range.year, 11, 31, 23, 59, 59, 999);
        }
        break;

      case 'between_dates':
        if (range.startDate && range.endDate) {
          startDate = normalizeDate(new Date(range.startDate));
          endDate = normalizeDateEnd(new Date(range.endDate));
        }
        break;

      default:
        // No date filtering
        break;
    }

    return { startDate, endDate };
  }, [normalizeDate, normalizeDateEnd]);

  // Filter tasks based on different date criteria
  const filterTasksByDateField = useCallback((tasks, dateField, startDate, endDate) => {
    if (!startDate && !endDate) return tasks;

    return tasks.filter(task => {
      let dateToCheck = null;

      switch (dateField) {
        case 'created_at':
          dateToCheck = task.created_at;
          break;
        case 'due_date':
          dateToCheck = task.due_date;
          break;
        case 'start_date':
          dateToCheck = task.start_date;
          break;
        case 'last_modified':
          dateToCheck = task.last_modified;
          break;
        case 'completed_date':
          // Use last_modified if task is complete
          dateToCheck = task.is_complete ? task.last_modified : null;
          break;
        default:
          dateToCheck = task.due_date || task.created_at;
      }

      return isDateInRange(dateToCheck, startDate, endDate);
    });
  }, [isDateInRange]);

  // Main filtering function
  const filteredTasks = useMemo(() => {
    if (!dateRange || Object.keys(dateRange).length === 0) {
      return allTasks;
    }

    setProcessingState(prev => ({ ...prev, isProcessing: true }));

    try {
      const { startDate, endDate } = calculateDateBoundaries(dateRange);
      const dateField = dateRange.dateField || 'due_date';
      
      const filtered = filterTasksByDateField(allTasks, dateField, startDate, endDate);
      
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        lastProcessedRange: dateRange,
        cacheKey: JSON.stringify({ dateRange, tasksCount: allTasks.length })
      }));

      return filtered;
    } catch (error) {
      console.error('Error filtering tasks by date range:', error);
      setProcessingState(prev => ({ ...prev, isProcessing: false }));
      return allTasks;
    }
  }, [allTasks, dateRange, calculateDateBoundaries, filterTasksByDateField]);

  // Get tasks that are overdue
  const overdueTasks = useMemo(() => {
    const now = new Date();
    return allTasks.filter(task => {
      if (task.is_complete || !task.due_date) return false;
      return new Date(task.due_date) < now;
    });
  }, [allTasks]);

  // Get tasks due today
  const tasksDueToday = useMemo(() => {
    const today = normalizeDate(new Date());
    return allTasks.filter(task => {
      if (task.is_complete || !task.due_date) return false;
      const dueDate = normalizeDate(new Date(task.due_date));
      return dueDate.getTime() === today.getTime();
    });
  }, [allTasks, normalizeDate]);

  // Get tasks due this week
  const tasksDueThisWeek = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return allTasks.filter(task => {
      if (task.is_complete || !task.due_date) return false;
      return isDateInRange(task.due_date, startOfWeek, endOfWeek);
    });
  }, [allTasks, isDateInRange]);

  // Get recently completed tasks (last 7 days)
  const recentlyCompletedTasks = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return allTasks.filter(task => {
      if (!task.is_complete || !task.last_modified) return false;
      return isDateInRange(task.last_modified, sevenDaysAgo, new Date());
    });
  }, [allTasks, isDateInRange]);

  // Get tasks by completion status in date range
  const getTasksByCompletionInRange = useCallback((startDate, endDate, includeCompleted = true, includeIncomplete = true) => {
    return allTasks.filter(task => {
      // Filter by completion status
      if (!includeCompleted && task.is_complete) return false;
      if (!includeIncomplete && !task.is_complete) return false;

      // For completed tasks, check completion date
      if (task.is_complete && task.last_modified) {
        return isDateInRange(task.last_modified, startDate, endDate);
      }

      // For incomplete tasks, check due date or creation date
      const dateToCheck = task.due_date || task.created_at;
      return isDateInRange(dateToCheck, startDate, endDate);
    });
  }, [allTasks, isDateInRange]);

  // Get date range statistics
  const dateRangeStats = useMemo(() => {
    if (!dateRange || filteredTasks.length === 0) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        incompleteTasks: 0,
        overdueTasks: 0,
        completionRate: 0,
        averageDuration: 0
      };
    }

    const completed = filteredTasks.filter(task => task.is_complete);
    const incomplete = filteredTasks.filter(task => !task.is_complete);
    const overdue = filteredTasks.filter(task => {
      if (task.is_complete || !task.due_date) return false;
      return new Date(task.due_date) < new Date();
    });

    const totalDuration = filteredTasks.reduce((sum, task) => {
      return sum + (task.duration_days || 0);
    }, 0);

    const averageDuration = filteredTasks.length > 0 ? totalDuration / filteredTasks.length : 0;
    const completionRate = filteredTasks.length > 0 ? (completed.length / filteredTasks.length) * 100 : 0;

    return {
      totalTasks: filteredTasks.length,
      completedTasks: completed.length,
      incompleteTasks: incomplete.length,
      overdueTasks: overdue.length,
      completionRate: Math.round(completionRate * 100) / 100,
      averageDuration: Math.round(averageDuration * 100) / 100
    };
  }, [filteredTasks, dateRange]);

  // Utility function to get predefined date range options
  const getDateRangeOptions = useCallback(() => {
    return [
      { value: 'today', label: 'Today' },
      { value: 'yesterday', label: 'Yesterday' },
      { value: 'this_week', label: 'This Week' },
      { value: 'last_week', label: 'Last Week' },
      { value: 'this_month', label: 'This Month' },
      { value: 'last_month', label: 'Last Month' },
      { value: 'this_quarter', label: 'This Quarter' },
      { value: 'last_quarter', label: 'Last Quarter' },
      { value: 'this_year', label: 'This Year' },
      { value: 'last_year', label: 'Last Year' },
      { value: 'last_30_days', label: 'Last 30 Days' },
      { value: 'last_60_days', label: 'Last 60 Days' },
      { value: 'last_90_days', label: 'Last 90 Days' },
      { value: 'next_7_days', label: 'Next 7 Days' },
      { value: 'next_30_days', label: 'Next 30 Days' },
      { value: 'custom', label: 'Custom Range' }
    ];
  }, []);

  // Get human-readable description of current date range
  const getDateRangeDescription = useCallback(() => {
    if (!dateRange || !dateRange.type) return 'All tasks';

    const option = getDateRangeOptions().find(opt => opt.value === dateRange.type);
    if (option) return option.label;

    if (dateRange.type === 'custom' && dateRange.startDate && dateRange.endDate) {
      const start = new Date(dateRange.startDate).toLocaleDateString();
      const end = new Date(dateRange.endDate).toLocaleDateString();
      return `${start} - ${end}`;
    }

    if (dateRange.type === 'specific_month' && dateRange.month !== undefined && dateRange.year !== undefined) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[dateRange.month]} ${dateRange.year}`;
    }

    return 'Custom range';
  }, [dateRange, getDateRangeOptions]);

  return {
    // Filtered tasks based on date range
    filteredTasks,
    
    // Pre-computed common task lists
    overdueTasks,
    tasksDueToday,
    tasksDueThisWeek,
    recentlyCompletedTasks,
    
    // Statistics for the current date range
    dateRangeStats,
    
    // State
    loading: tasksLoading || processingState.isProcessing,
    
    // Utility functions
    getTasksByCompletionInRange,
    getDateRangeOptions,
    getDateRangeDescription,
    calculateDateBoundaries,
    isDateInRange,
    
    // Helper functions for date manipulation
    normalizeDate,
    normalizeDateEnd,
    
    // Meta information
    totalTasks: allTasks.length,
    hasDateFilter: dateRange && Object.keys(dateRange).length > 0,
    currentDateRange: dateRange
  };
};