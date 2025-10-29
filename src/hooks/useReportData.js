// src/hooks/useReportData.js
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTasks } from '../contexts/TaskContext';

const findTaskById = (taskList, id) => {
  for (const task of taskList) {
    if (task.id === id) {
      return task;
    }
  }
  return undefined;
};

/**
 * Custom hook for processing and filtering report data
 * Handles complex date filtering, task categorization, and report calculations
 */
export const useReportData = (selectedMonth, filters = {}) => {
  const { instanceTasks, memberProjectTasks, loading: tasksLoading } = useTasks();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedKey, setLastProcessedKey] = useState('');

  // Helper function to check if a date falls within a specific month
  const isDateInMonth = useCallback((dateString, month, year) => {
    if (!dateString) return false;
    try {
      const date = new Date(dateString);
      return date.getMonth() === month && date.getFullYear() === year;
    } catch (error) {
      console.warn('Invalid date string:', dateString);
      return false;
    }
  }, []);

  // Helper function to check if a date is before the end of a specific month
  const isDateBeforeEndOfMonth = useCallback((dateString, month, year) => {
    if (!dateString) return false;
    try {
      const date = new Date(dateString);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return date <= endOfMonth;
    } catch (error) {
      console.warn('Invalid date string:', dateString);
      return false;
    }
  }, []);

  // Helper function to check if a date is in the month after the selected month
  const isDateInNextMonth = useCallback((dateString, month, year) => {
    if (!dateString) return false;
    try {
      const date = new Date(dateString);
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      return date.getMonth() === nextMonth && date.getFullYear() === nextYear;
    } catch (error) {
      console.warn('Invalid date string:', dateString);
      return false;
    }
  }, []);

  // Helper function to get all tasks belonging to a project (including children)
  const getProjectTasks = useCallback((projectId, taskList) => {
    const projectTaskIds = new Set([projectId]);
    const stack = [projectId];

    while (stack.length > 0) {
      const parentId = stack.pop();
      for (const task of taskList) {
        if (task.parent_task_id === parentId && !projectTaskIds.has(task.id)) {
          projectTaskIds.add(task.id);
          stack.push(task.id);
        }
      }
    }

    return taskList.filter(task => projectTaskIds.has(task.id));
  }, []);

  // Helper function to find root project for a task
  const findRootProject = useCallback((taskId, taskList) => {
    let currentTask = findTaskById(taskList, taskId);
    while (currentTask && currentTask.parent_task_id) {
      currentTask = findTaskById(taskList, currentTask.parent_task_id);
    }
    return currentTask;
  }, []);

  // Get all available tasks (owned + member projects)
  const allTasks = useMemo(() => {
    return [...instanceTasks, ...memberProjectTasks];
  }, [instanceTasks, memberProjectTasks]);

  // Apply project filtering
  const filteredTasks = useMemo(() => {
    let tasks = allTasks;

    // Project filter
    if (filters.projects && !filters.projects.includes('all') && filters.projects.length > 0) {
      const projectTaskIds = new Set();
      filters.projects.forEach(projectId => {
        const projectTasks = getProjectTasks(projectId, tasks);
        projectTasks.forEach(task => projectTaskIds.add(task.id));
      });
      tasks = tasks.filter(task => projectTaskIds.has(task.id));
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      switch (filters.status) {
        case 'completed':
          tasks = tasks.filter(task => task.is_complete);
          break;
        case 'incomplete':
          tasks = tasks.filter(task => !task.is_complete);
          break;
        case 'overdue':
          tasks = tasks.filter(task => {
            if (task.is_complete) return false;
            if (!task.due_date) return false;
            return new Date(task.due_date) < new Date();
          });
          break;
        default:
          break;
      }
    }

    // Creator filter
    if (filters.createdBy && filters.createdBy !== 'all') {
      tasks = tasks.filter(task => task.creator === filters.createdBy);
    }

    // Assignee filter
    if (filters.assignedTo && filters.assignedTo !== 'all') {
      tasks = tasks.filter(task => {
        if (!task.assigned_users || !Array.isArray(task.assigned_users)) {
          return false;
        }
        return task.assigned_users.includes(filters.assignedTo);
      });
    }

    // Tags filter
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      tasks = tasks.filter(task => {
        if (!task.tags || !Array.isArray(task.tags)) {
          return false;
        }
        return filters.tags.some(filterTag => task.tags.includes(filterTag));
      });
    }

    // Date range filter (if not using month selector)
    if (filters.dateRange !== 'all' && filters.dateRange !== undefined) {
      const now = new Date();
      let startDate, endDate;

      switch (filters.dateRange) {
        case 'last_3_months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          endDate = now;
          break;
        case 'last_6_months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          endDate = now;
          break;
        case 'last_year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          endDate = now;
          break;
        case 'this_year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = now;
          break;
        case 'custom':
          if (filters.customStartDate) {
            startDate = new Date(filters.customStartDate);
          }
          if (filters.customEndDate) {
            endDate = new Date(filters.customEndDate);
          }
          break;
        default:
          break;
      }

      if (startDate || endDate) {
        tasks = tasks.filter(task => {
          const taskDate = new Date(task.due_date || task.created_at);
          if (startDate && taskDate < startDate) return false;
          if (endDate && taskDate > endDate) return false;
          return true;
        });
      }
    }

    // Include/exclude subtasks
    if (filters.includeSubtasks === false) {
      tasks = tasks.filter(task => !task.parent_task_id);
    }

    return tasks;
  }, [allTasks, filters, getProjectTasks]);

  // Calculate main report data
  const reportData = useMemo(() => {
    if (!selectedMonth) {
      return {
        completedThisMonth: [],
        overdueEndOfMonth: [],
        dueNextMonth: [],
        totalTasks: 0,
        completionRate: 0,
        loading: tasksLoading,
        error: null
      };
    }

    setIsProcessing(true);
    
    const { month, year } = selectedMonth;
    
    try {
      // Tasks completed during the reporting month
      const completedThisMonth = filteredTasks.filter(task => 
        task.is_complete && isDateInMonth(task.last_modified, month, year)
      );

      // Tasks that were overdue as of the end of the reporting month
      const overdueEndOfMonth = filteredTasks.filter(task => {
        if (task.is_complete) return false;
        if (!task.due_date) return false;
        
        const dueDate = new Date(task.due_date);
        const endOfReportingMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
        
        return dueDate < endOfReportingMonth;
      });

      // Tasks due in the month after the reporting month
      const dueNextMonth = filteredTasks.filter(task => 
        !task.is_complete && isDateInNextMonth(task.due_date, month, year)
      );

      // Calculate total relevant tasks for the period
      const totalRelevantTasks = filteredTasks.filter(task => {
        // Include incomplete tasks
        if (!task.is_complete) return true;
        
        // Include completed tasks that were completed during or after the reporting period
        if (task.last_modified) {
          const completedDate = new Date(task.last_modified);
          const startOfReportingMonth = new Date(year, month, 1);
          return completedDate >= startOfReportingMonth;
        }
        
        return true;
      });

      // Calculate completion rate
      const completionRate = totalRelevantTasks.length > 0 
        ? (completedThisMonth.length / totalRelevantTasks.length) * 100 
        : 0;

      return {
        completedThisMonth,
        overdueEndOfMonth,
        dueNextMonth,
        totalTasks: totalRelevantTasks.length,
        completionRate,
        loading: false,
        error: null
      };
    } catch (error) {
      console.error('Error calculating report data:', error);
      return {
        completedThisMonth: [],
        overdueEndOfMonth: [],
        dueNextMonth: [],
        totalTasks: 0,
        completionRate: 0,
        loading: false,
        error: error.message
      };
    } finally {
      setIsProcessing(false);
    }
  }, [filteredTasks, selectedMonth, isDateInMonth, isDateInNextMonth, tasksLoading]);

  // Get project statistics
  const projectStats = useMemo(() => {
    const projectMap = new Map();
    
    filteredTasks.forEach(task => {
      const rootProject = findRootProject(task.id, allTasks);
      if (!rootProject) return;
      
      const projectId = rootProject.id;
      const projectTitle = rootProject.title || 'Untitled Project';
      
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          id: projectId,
          title: projectTitle,
          totalTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          upcomingTasks: 0
        });
      }
      
      const stats = projectMap.get(projectId);
      stats.totalTasks++;
      
      if (task.is_complete) {
        if (selectedMonth && isDateInMonth(task.last_modified, selectedMonth.month, selectedMonth.year)) {
          stats.completedTasks++;
        }
      } else if (task.due_date) {
        const dueDate = new Date(task.due_date);
        const now = new Date();
        
        if (dueDate < now) {
          stats.overdueTasks++;
        } else if (selectedMonth && isDateInNextMonth(task.due_date, selectedMonth.month, selectedMonth.year)) {
          stats.upcomingTasks++;
        }
      }
    });
    
    return Array.from(projectMap.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [filteredTasks, selectedMonth, findRootProject, allTasks, isDateInMonth, isDateInNextMonth]);

  // Get available projects for filtering
  const availableProjects = useMemo(() => {
    const projectsMap = new Map();
    
    allTasks.forEach(task => {
      if (!task.parent_task_id) { // Top-level projects only
        projectsMap.set(task.id, {
          id: task.id,
          title: task.title || 'Untitled Project'
        });
      }
    });
    
    return Array.from(projectsMap.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [allTasks]);

  // Calculate trend data (comparison with previous period)
  const trendData = useMemo(() => {
    if (!selectedMonth) return null;
    
    const { month, year } = selectedMonth;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    
    // Previous month's completed tasks
    const prevMonthCompleted = filteredTasks.filter(task => 
      task.is_complete && isDateInMonth(task.last_modified, prevMonth, prevYear)
    );
    
    // Calculate trends
    const currentCompleted = reportData.completedThisMonth.length;
    const previousCompleted = prevMonthCompleted.length;
    
    const completionTrend = previousCompleted > 0 
      ? ((currentCompleted - previousCompleted) / previousCompleted) * 100 
      : currentCompleted > 0 ? 100 : 0;
    
    return {
      completedTasks: {
        current: currentCompleted,
        previous: previousCompleted,
        trend: completionTrend,
        direction: completionTrend > 0 ? 'up' : completionTrend < 0 ? 'down' : 'neutral'
      }
    };
  }, [selectedMonth, filteredTasks, reportData.completedThisMonth, isDateInMonth]);

  // Export data functionality
  const exportData = useCallback(async (format = 'csv') => {
    try {
      const exportData = {
        reportPeriod: selectedMonth ? 
          `${selectedMonth.month + 1}/${selectedMonth.year}` : 'All Time',
        generatedAt: new Date().toISOString(),
        summary: {
          totalTasks: reportData.totalTasks,
          completedTasks: reportData.completedThisMonth.length,
          overdueTasks: reportData.overdueEndOfMonth.length,
          upcomingTasks: reportData.dueNextMonth.length,
          completionRate: `${reportData.completionRate.toFixed(1)}%`
        },
        tasks: {
          completed: reportData.completedThisMonth.map(task => ({
            id: task.id,
            title: task.title,
            project: findRootProject(task.id, allTasks)?.title || 'Unknown',
            completedDate: task.last_modified,
            duration: task.duration_days
          })),
          overdue: reportData.overdueEndOfMonth.map(task => ({
            id: task.id,
            title: task.title,
            project: findRootProject(task.id, allTasks)?.title || 'Unknown',
            dueDate: task.due_date,
            daysOverdue: Math.ceil((new Date() - new Date(task.due_date)) / (1000 * 60 * 60 * 24))
          })),
          upcoming: reportData.dueNextMonth.map(task => ({
            id: task.id,
            title: task.title,
            project: findRootProject(task.id, allTasks)?.title || 'Unknown',
            dueDate: task.due_date,
            duration: task.duration_days
          }))
        },
        projectStats
      };

      // In a real implementation, you'd convert this to the requested format
      // For now, return the structured data
      return {
        success: true,
        data: exportData,
        format
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }, [reportData, projectStats, selectedMonth, findRootProject, allTasks]);

  // Create a cache key for memoization
  const cacheKey = useMemo(() => {
    return JSON.stringify({
      selectedMonth,
      filters,
      tasksCount: allTasks.length,
      lastModified: Math.max(...allTasks.map(t => new Date(t.last_modified || t.created_at).getTime()))
    });
  }, [selectedMonth, filters, allTasks]);

  // Update processing key when cache key changes
  useEffect(() => {
    if (cacheKey !== lastProcessedKey) {
      setLastProcessedKey(cacheKey);
    }
  }, [cacheKey, lastProcessedKey]);

  return {
    // Main report data
    reportData,
    
    // Additional insights
    projectStats,
    trendData,
    availableProjects,
    
    // State
    loading: tasksLoading || isProcessing,
    error: reportData.error,
    
    // Utilities
    exportData,
    
    // Helper functions (exposed for advanced use cases)
    findRootProject: (taskId) => findRootProject(taskId, allTasks),
    isDateInMonth,
    isDateInNextMonth,
    isDateBeforeEndOfMonth,
    
    // Meta information
    totalFilteredTasks: filteredTasks.length,
    totalAllTasks: allTasks.length,
    filtersApplied: Object.keys(filters).length > 0
  };
};