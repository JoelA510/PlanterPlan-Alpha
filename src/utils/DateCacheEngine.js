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
    // Initialize all tasks
    const newMap = new Map();
    tasks.forEach(task => {
      newMap.set(task.id, { affects: new Set(), affectedBy: new Set() });
    });

    // Parent-child relationships
    tasks.forEach(task => {
      if (task.parent_task_id && newMap.has(task.parent_task_id)) {
        const parent = newMap.get(task.parent_task_id);
        const child = newMap.get(task.id);
        parent.affects.add(task.id);
        child.affectedBy.add(task.parent_task_id);
      }
    });

    // Sibling relationships for sequential ordering
    const tasksByParent = new Map();
    tasks.forEach(task => {
      const pid = task.parent_task_id || 'root';
      if (!tasksByParent.has(pid)) tasksByParent.set(pid, []);
      tasksByParent.get(pid).push(task);
    });

    tasksByParent.forEach(sibs => {
      const sorted = sibs.sort((a, b) => (a.position || 0) - (b.position || 0));
      for (let i = 0; i < sorted.length - 1; i++) {
        const cur = newMap.get(sorted[i].id);
        const next = newMap.get(sorted[i + 1].id);
        cur.affects.add(sorted[i + 1].id);
        next.affectedBy.add(sorted[i].id);
      }
    });

    this.dependencyMap = newMap;
  }

  /**
   * Calculate dates for a single task based on its context
   */
  calculateTaskDates(task, tasks, projectStartDate, existingDates = {}) {
    const duration = task.duration_days || 1;
    let startDate;

    if (!task.parent_task_id) {
      // Root task
      startDate = projectStartDate ? new Date(projectStartDate) : new Date();
    } else {
      const parentTask = tasks.find(t => t.id === task.parent_task_id);
      let parentStart = parentTask && existingDates[parentTask.id]
        ? new Date(existingDates[parentTask.id].start_date)
        : parentTask && parentTask.start_date
          ? new Date(parentTask.start_date)
          : new Date();

      // Previous sibling
      const siblings = tasks
        .filter(t => t.parent_task_id === task.parent_task_id)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      const idx = siblings.findIndex(t => t.id === task.id);
      if (idx > 0) {
        const prev = siblings[idx - 1];
        startDate = existingDates[prev.id]
          ? new Date(existingDates[prev.id].due_date)
          : (() => {
              const est = new Date(parentStart);
              est.setDate(est.getDate() + (siblings.slice(0, idx).reduce((sum, s) => sum + (s.duration_days||1), 0)));
              return est;
            })();
      } else {
        startDate = new Date(parentStart);
      }

      // days_from_start_until_due override
      if (task.days_from_start_until_due != null) {
        startDate = new Date(parentStart);
        startDate.setDate(startDate.getDate() + parseInt(task.days_from_start_until_due, 10));
      }
    }

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
   * Full recalculation of all task dates
   */
  calculateAllDates(tasks, projectStartDate) {
    if (this.isCalculating) return this.cache;
    this.isCalculating = true;

    const newVersion = this.generateCacheKey(tasks, projectStartDate);
    if (this.cacheVersion === newVersion && this.cache.size) {
      this.isCalculating = false;
      return this.cache;
    }

    this.cacheVersion = newVersion;
    this.buildDependencyMap(tasks);
    const newCache = new Map();
    const processed = new Set();

    const process = id => {
      if (processed.has(id)) return;
      const deps = this.dependencyMap.get(id);
      deps && deps.affectedBy.forEach(depId => process(depId));
      const task = tasks.find(t => t.id === id);
      if (task) {
        const existing = Object.fromEntries(newCache);
        const dates = this.calculateTaskDates(task, tasks, projectStartDate, existing);
        newCache.set(id, dates);
        processed.add(id);
      }
    };

    tasks.forEach(t => process(t.id));
    this.cache = newCache;
    this.isCalculating = false;
    return this.cache;
  }

  /**
   * Incremental update when specific tasks change
   */
  updateTaskDatesIncremental(changedIds, tasks, projectStartDate) {
    if (!Array.isArray(changedIds)) changedIds = [changedIds];
    const newVersion = this.generateCacheKey(tasks, projectStartDate);
    if (this.cacheVersion !== newVersion) {
      return this.calculateAllDates(tasks, projectStartDate);
    }

    const toRecalc = new Set();
    const mark = id => {
      toRecalc.add(id);
      const deps = this.dependencyMap.get(id);
      deps && deps.affects.forEach(a => !toRecalc.has(a) && mark(a));
    };
    changedIds.forEach(mark);

    const existing = Object.fromEntries(this.cache);
    const list = Array.from(toRecalc)
      .map(id => tasks.find(t => t.id === id))
      .filter(Boolean)
      .sort((a, b) => this.getTaskLevel(a, tasks) - this.getTaskLevel(b, tasks));

    list.forEach(task => {
      const dates = this.calculateTaskDates(task, tasks, projectStartDate, existing);
      this.cache.set(task.id, dates);
      existing[task.id] = dates;
    });

    return this.cache;
  }

  /**
   * Determine task level in hierarchy
   */
  getTaskLevel(task, tasks) {
    let lvl = 0;
    let cur = task;
    while (cur.parent_task_id) {
      lvl++;
      cur = tasks.find(t => t.id === cur.parent_task_id) || {};
      if (lvl > 20) break;
    }
    return lvl;
  }

  /**
   * Accessors and utilities
   */
  getTaskDates(id) { return this.cache.get(id) || null; }
  getAllDates() { return Object.fromEntries(this.cache); }
  clearCache() { this.cache.clear(); this.dependencyMap.clear(); this.cacheVersion = ''; }
  getCacheStats() {
    return { cacheSize: this.cache.size, cacheVersion: this.cacheVersion, dependencyMapSize: this.dependencyMap.size, isCalculating: this.isCalculating };
  }
}
