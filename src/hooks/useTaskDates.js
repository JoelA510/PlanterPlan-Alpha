// src/hooks/useTaskDates.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { DateCacheEngine } from '../utils/DateCacheEngine';

export const useTaskDates = (tasks, projectStartDate) => {
  const engineRef = useRef(new DateCacheEngine());
  const [taskDates, setTaskDates] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);

  // Force re-render when dates change
  const forceUpdate = useCallback(() => {
    setLastUpdate(Date.now());
  }, []);

  /**
   * Recalculate all task dates
   */
  const recalculateAllDates = useCallback(async () => {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      setTaskDates({});
      return {};
    }

    setIsCalculating(true);
    
    try {
      // Use setTimeout to avoid blocking UI
      return new Promise((resolve) => {
        setTimeout(() => {
          const engine = engineRef.current;
          const dates = engine.calculateAllDates(tasks, projectStartDate);
          const datesObj = Object.fromEntries(dates);
          
          setTaskDates(datesObj);
          setIsCalculating(false);
          forceUpdate();
          resolve(datesObj);
        }, 0);
      });
    } catch (error) {
      console.error('Error recalculating dates:', error);
      setIsCalculating(false);
      return {};
    }
  }, [tasks, projectStartDate, forceUpdate]);

  /**
   * Update specific task dates incrementally
   */
  const updateTaskDates = useCallback(async (changedTaskIds) => {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return {};
    }

    setIsCalculating(true);

    try {
      return new Promise((resolve) => {
        setTimeout(() => {
          const engine = engineRef.current;
          const dates = engine.updateTaskDatesIncremental(changedTaskIds, tasks, projectStartDate);
          const datesObj = Object.fromEntries(dates);
          
          setTaskDates(datesObj);
          setIsCalculating(false);
          forceUpdate();
          resolve(datesObj);
        }, 0);
      });
    } catch (error) {
      console.error('Error updating task dates:', error);
      setIsCalculating(false);
      return taskDates;
    }
  }, [tasks, projectStartDate, taskDates, forceUpdate]);

  /**
   * Get dates for a specific task
   */
  const getTaskDates = useCallback((taskId) => {
    return taskDates[taskId] || null;
  }, [taskDates]);

  /**
   * Get effective start date for a task
   */
  const getTaskStartDate = useCallback((taskId) => {
    const dates = getTaskDates(taskId);
    if (dates?.start_date) {
      return new Date(dates.start_date);
    }
    
    // Fallback to stored date
    const task = tasks.find(t => t.id === taskId);
    if (task?.start_date) {
      return new Date(task.start_date);
    }
    
    return new Date();
  }, [getTaskDates, tasks]);

  /**
   * Get effective due date for a task
   */
  const getTaskDueDate = useCallback((taskId) => {
    const dates = getTaskDates(taskId);
    if (dates?.due_date) {
      return new Date(dates.due_date);
    }
    
    // Fallback to stored date
    const task = tasks.find(t => t.id === taskId);
    if (task?.due_date) {
      return new Date(task.due_date);
    }
    
    // Calculate from start date + duration
    const startDate = getTaskStartDate(taskId);
    const duration = task?.duration_days || 1;
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + duration);
    return dueDate;
  }, [getTaskDates, getTaskStartDate, tasks]);

  /**
   * Get effective duration for a task (calculated from children if parent)
   */
  const getTaskDuration = useCallback((taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return 1;

    const hasChildren = tasks.some(t => t.parent_task_id === taskId);
    
    if (hasChildren) {
      // Calculate duration from children
      const children = tasks
        .filter(t => t.parent_task_id === taskId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      if (children.length === 0) return task.duration_days || 1;

      // Sum of all children durations for sequential execution
      return children.reduce((total, child) => {
        return total + getTaskDuration(child.id);
      }, 0);
    }

    return task.duration_days || 1;
  }, [tasks]);

  /**
   * Check if a task is overdue
   */
  const isTaskOverdue = useCallback((taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.is_complete) return false;

    const dueDate = getTaskDueDate(taskId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  }, [tasks, getTaskDueDate]);

  /**
   * Check if a task is due today
   */
  const isTaskDueToday = useCallback((taskId) => {
    const dueDate = getTaskDueDate(taskId);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  }, [getTaskDueDate]);

  /**
   * Get cache statistics for debugging
   */
  const getCacheStats = useCallback(() => {
    return engineRef.current.getCacheStats();
  }, []);

  /**
   * Clear cache (for debugging)
   */
  const clearCache = useCallback(() => {
    engineRef.current.clearCache();
    setTaskDates({});
    forceUpdate();
  }, [forceUpdate]);

  // Effect to recalculate dates when tasks or project start date changes
  useEffect(() => {
    recalculateAllDates();
  }, [recalculateAllDates]);

  return {
    // State
    taskDates,
    isCalculating,
    
    // Functions
    recalculateAllDates,
    updateTaskDates,
    getTaskDates,
    getTaskStartDate,
    getTaskDueDate,
    getTaskDuration,
    
    // Utilities
    isTaskOverdue,
    isTaskDueToday,
    
    // Debug
    getCacheStats,
    clearCache
  };
};