// src/utils/DateCacheEngine.js
export class DateCacheEngine {
  constructor() {
    this.cache = new Map(); // taskId -> { start_date, due_date, calculation_version }
    this.dependencyMap = new Map(); // taskId -> { affects: Set, affectedBy: Set }
    this.cacheVersion = '';
    this.isCalculating = false;
  }

  /**
   * Generate cache key from task structure that affects dates
   */
  generateCacheKey(tasks, projectStartDate) {
    const structureParts = tasks
      .map(task => `${task.id}:${task.parent_task_id || 'root'}:${task.position || 0}:${task.duration_days || 1}`)
      .sort()
      .join('|');
    
    const startDatePart = projectStartDate ? new Date(projectStartDate).toISOString().split('T')[0] : 'no-start';
    return `${startDatePart}-${this.hashString(structureParts)}`;
  }

  /**
   * Simple string hash function
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Build dependency map for fast lookups
   */
  buildDependencyMap(tasks) {
    const newMap = new Map();
    
    // Initialize all tasks
    tasks.forEach(task => {
      newMap.set(task.id, {
        affects: new Set(),
        affectedBy: new Set()
      });
    });

    // Build parent-child relationships
    tasks.forEach(task => {
      if (task.parent_task_id) {
        const parent = newMap.get(task.parent_task_id);
        const child = newMap.get(task.id);
        
        if (parent && child) {
          parent.affects.add(task.id);
          child.affectedBy.add(task.parent_task_id);
        }
      }
    });

    // Build sibling relationships (for position-based sequencing)
    const tasksByParent = new Map();
    tasks.forEach(task => {
      const parentId = task.parent_task_id || 'root';
      if (!tasksByParent.has(parentId)) {
        tasksByParent.set(parentId, []);
      }
      tasksByParent.get(parentId).push(task);
    });

    // Sort siblings by position and add sequential dependencies
    tasksByParent.forEach((siblings, parentId) => {
      const sortedSiblings = siblings.sort((a, b) => (a.position || 0) - (b.position || 0));
      
      for (let i = 0; i < sortedSiblings.length - 1; i++) {
        const current = newMap.get(sortedSiblings[i].id);
        const next = newMap.get(sortedSiblings[i + 1].id);
        
        if (current && next) {
          current.affects.add(sortedSiblings[i + 1].id);
          next.affectedBy.add(sortedSiblings[i].id);
        }
      }
    });

    this.dependencyMap = newMap;
  }

  /**
   * Calculate dates for a single task based on its context
   */
  calculateTaskDates(task, tasks, projectStartDate, existingDates = {}) {
    const taskId = task.id;
    const duration = task.duration_days || 1;
    
    // Find start date based on task type and dependencies
    let startDate;

    if (!task.parent_task_id) {
      // Root task - use project start date
      startDate = projectStartDate ? new Date(projectStartDate) : new Date();
    } else {
      // Child task - depends on parent and previous siblings
      const parent = tasks.find(t => t.id === task.parent_task_id);
      if (!parent) {
        startDate = new Date();
      } else {
        // Get parent's start date
        let parentStartDate;
        if (existingDates[parent.id]) {
          parentStartDate = new Date(existingDates[parent.id].start_date);
        } else {
          // Parent not calculated yet, use stored date or fallback
          parentStartDate = parent.start_date ? new Date(parent.start_date) : new Date();
        }

        // Check for previous siblings
        const siblings = tasks
          .filter(t => t.parent_task_id === task.parent_task_id)
          .sort((a, b) => (a.position || 0) - (b.position || 0));
        
        const taskIndex = siblings.findIndex(t => t.id === taskId);
        
        if (taskIndex > 0) {
          // Start after previous sibling
          const prevSibling = siblings[taskIndex - 1];
          if (existingDates[prevSibling.id]) {
            startDate = new Date(existingDates[prevSibling.id].due_date);
          } else {
            // Previous sibling not calculated, estimate
            const prevDuration = prevSibling.duration_days || 1;
            startDate = new Date(parentStartDate);
            startDate.setDate(startDate.getDate() + (taskIndex * prevDuration));
          }
        } else {
          // First child - start with parent
          startDate = new Date(parentStartDate);
        }

        // Handle days_from_start_until_due offset if present
        if (task.days_from_start_until_due) {
          startDate = new Date(parentStartDate);
          startDate.setDate(startDate.getDate() + parseInt(task.days_from_start_until_due, 10));
        }
      }
    }

    // Calculate due date
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + duration);

    return {
      start_date: startDate.toISOString(),
      due_date: dueDate.toISOString(),
      duration_days: duration,
      calculation_version: this.cacheVersion
    };
  }

  /**
   * Calculate dates for all tasks (full recalculation)
   */
  calculateAllDates(tasks, projectStartDate) {
    if (this.isCalculating) {
      console.warn('Date calculation already in progress');
      return this.cache;
    }

    this.isCalculating = true;
    const newCacheVersion = this.generateCacheKey(tasks, projectStartDate);
    
    // Check if cache is still valid
    if (this.cacheVersion === newCacheVersion && this.cache.size > 0) {
      this.isCalculating = false;
      return this.cache;
    }

    try {
      this.cacheVersion = newCacheVersion;
      this.buildDependencyMap(tasks);
      const newCache = new Map();
      const processedTasks = new Set();

      // Process tasks in dependency order
      const processTask = (taskId) => {
        if (processedTasks.has(taskId)) return;
        
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Process dependencies first
        const deps = this.dependencyMap.get(taskId);
        if (deps) {
          deps.affectedBy.forEach(depId => {
            if (!processedTasks.has(depId)) {
              processTask(depId);
            }
          });
        }

        // Calculate this task's dates
        const existingDates = Object.fromEntries(newCache);
        const calculatedDates = this.calculateTaskDates(task, tasks, projectStartDate, existingDates);
        newCache.set(taskId, calculatedDates);
        processedTasks.add(taskId);
      };

      // Process all tasks
      tasks.forEach(task => processTask(task.id));

      this.cache = newCache;
      this.isCalculating = false;
      return this.cache;
    } catch (error) {
      console.error('Error in calculateAllDates:', error);
      this.isCalculating = false;
      return this.cache;
    }
  }

  /**
   * Incrementally update dates when specific tasks change
   */
  updateTaskDatesIncremental(changedTaskIds, tasks, projectStartDate) {
    if (!Array.isArray(changedTaskIds)) {
      changedTaskIds = [changedTaskIds];
    }

    const newCacheVersion = this.generateCacheKey(tasks, projectStartDate);
    
    // If structure changed significantly, do full recalculation
    if (this.cacheVersion !== newCacheVersion) {
      return this.calculateAllDates(tasks, projectStartDate);
    }

    try {
      // Find all tasks that need recalculation
      const tasksToUpdate = new Set();
      const addAffectedTasks = (taskId) => {
        tasksToUpdate.add(taskId);
        const deps = this.dependencyMap.get(taskId);
        if (deps) {
          deps.affects.forEach(affectedId => {
            if (!tasksToUpdate.has(affectedId)) {
              addAffectedTasks(affectedId);
            }
          });
        }
      };

      changedTaskIds.forEach(taskId => addAffectedTasks(taskId));

      // Recalculate only affected tasks
      const existingDates = Object.fromEntries(this.cache);
      const sortedTasksToUpdate = Array.from(tasksToUpdate)
        .map(id => tasks.find(t => t.id === id))
        .filter(Boolean)
        .sort((a, b) => {
          // Sort by dependency order (parents before children)
          const aLevel = this.getTaskLevel(a, tasks);
          const bLevel = this.getTaskLevel(b, tasks);
          if (aLevel !== bLevel) return aLevel - bLevel;
          return (a.position || 0) - (b.position || 0);
        });

      sortedTasksToUpdate.forEach(task => {
        const calculatedDates = this.calculateTaskDates(task, tasks, projectStartDate, existingDates);
        this.cache.set(task.id, calculatedDates);
        existingDates[task.id] = calculatedDates;
      });

      return this.cache;
    } catch (error) {
      console.error('Error in updateTaskDatesIncremental:', error);
      // Fallback to full recalculation
      return this.calculateAllDates(tasks, projectStartDate);
    }
  }

  /**
   * Get task hierarchy level for sorting
   */
  getTaskLevel(task, tasks) {
    let level = 0;
    let current = task;
    while (current.parent_task_id) {
      level++;
      current = tasks.find(t => t.id === current.parent_task_id);
      if (!current || level > 10) break; // Prevent infinite loops
    }
    return level;
  }

  /**
   * Get cached dates for a task
   */
  getTaskDates(taskId) {
    return this.cache.get(taskId) || null;
  }

  /**
   * Get all cached dates
   */
  getAllDates() {
    return Object.fromEntries(this.cache);
  }

  /**
   * Clear cache (for debugging or reset)
   */
  clearCache() {
    this.cache.clear();
    this.dependencyMap.clear();
    this.cacheVersion = '';
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      cacheVersion: this.cacheVersion,
      dependencyMapSize: this.dependencyMap.size,
      isCalculating: this.isCalculating
    };
  }
}