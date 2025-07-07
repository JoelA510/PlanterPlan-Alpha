// src/utils/DateCacheEngine.js
export class DateCacheEngine {
  constructor() {
    this.cache = new Map(); // taskId -> { start_date, due_date, calculation_version }
    this.dependencyMap = new Map(); // taskId -> { affects: Set, affectedBy: Set }
    this.cacheVersion = '';
    this.lastTasksHash = '';
    this.isCalculating = false;
    this.debugMode = true; // Enable for debugging
  }

  /**
   * Generate cache key from task structure that affects dates
   * FIXED: Include timestamps to ensure proper invalidation
   */
  generateCacheKey(tasks, projectStartDate) {
    const structureParts = tasks
      .map(task => `${task.id}:${task.parent_task_id || 'root'}:${task.position || 0}:${task.duration_days || 1}`)
      .sort()
      .join('|');
    
    const startDatePart = projectStartDate ? new Date(projectStartDate).toISOString().split('T')[0] : 'no-start';
    const timestamp = Date.now(); // Add timestamp to force recalculation
    return `${startDatePart}-${this.hashString(structureParts)}-${timestamp}`;
  }

  /**
   * FIXED: More reliable cache invalidation
   * Check if tasks structure has actually changed
   */
  hasTaskStructureChanged(tasks) {
    const currentHash = this.generateTaskStructureHash(tasks);
    const hasChanged = currentHash !== this.lastTasksHash;
    
    if (this.debugMode && hasChanged) {
      console.log('📊 Task structure changed detected');
      console.log('Previous hash:', this.lastTasksHash);
      console.log('Current hash:', currentHash);
    }
    
    this.lastTasksHash = currentHash;
    return hasChanged;
  }

  /**
   * Generate a hash just for task structure (positions, parents, durations)
   */
  generateTaskStructureHash(tasks) {
    const structureParts = tasks
      .map(task => `${task.id}:${task.parent_task_id || 'root'}:${task.position || 0}:${task.duration_days || 1}`)
      .sort()
      .join('|');
    return this.hashString(structureParts);
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
        if (cur && next) {
          cur.affects.add(sorted[i + 1].id);
          next.affectedBy.add(sorted[i].id);
        }
      }
    });

    this.dependencyMap = newMap;
    
    if (this.debugMode) {
      console.log('📊 Built dependency map for', tasks.length, 'tasks');
    }
  }

  /**
   * Calculate dates for a single task based on its context
   */
  calculateTaskDates(task, tasks, projectStartDate, existingDates = {}) {
    const duration = task.duration_days || 1;
    let startDate;

    if (!task.parent_task_id) {
      // Root task - use project start date or current date
      startDate = projectStartDate ? new Date(projectStartDate) : new Date();
      
      if (this.debugMode) {
        console.log(`📅 Root task ${task.title || task.id}: start = ${startDate.toISOString()}`);
      }
    } else {
      const parentTask = tasks.find(t => t.id === task.parent_task_id);
      let parentStart = parentTask && existingDates[parentTask.id]
        ? new Date(existingDates[parentTask.id].start_date)
        : parentTask && parentTask.start_date
          ? new Date(parentTask.start_date)
          : new Date();

      // Get siblings and find position
      const siblings = tasks
        .filter(t => t.parent_task_id === task.parent_task_id)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      const idx = siblings.findIndex(t => t.id === task.id);
      
      if (idx > 0) {
        // Not the first child - start after previous sibling ends
        const prev = siblings[idx - 1];
        if (existingDates[prev.id]) {
          startDate = new Date(existingDates[prev.id].due_date);
        } else {
          // Fallback calculation if previous sibling not calculated yet
          const est = new Date(parentStart);
          const prevDuration = siblings.slice(0, idx).reduce((sum, s) => sum + (s.duration_days || 1), 0);
          est.setDate(est.getDate() + prevDuration);
          startDate = est;
        }
      } else {
        // First child - start with parent
        startDate = new Date(parentStart);
      }

      // Handle days_from_start_until_due override
      if (task.days_from_start_until_due != null) {
        startDate = new Date(parentStart);
        startDate.setDate(startDate.getDate() + parseInt(task.days_from_start_until_due, 10));
      }

      if (this.debugMode) {
        console.log(`📅 Child task ${task.title || task.id}: parent=${parentTask?.title || task.parent_task_id}, position=${idx}, start=${startDate.toISOString()}`);
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
   * FIXED: Force recalculation when structure changes
   * Full recalculation of all task dates
   */
  calculateAllDates(tasks, projectStartDate) {
    if (this.isCalculating) {
      console.log('⚠️ Already calculating, returning existing cache');
      return this.cache;
    }

    this.isCalculating = true;

    try {
      // FORCE recalculation if task structure changed
      const forceRecalc = this.hasTaskStructureChanged(tasks);
      const newVersion = this.generateCacheKey(tasks, projectStartDate);
      
      if (!forceRecalc && this.cacheVersion === newVersion && this.cache.size > 0) {
        if (this.debugMode) {
          console.log('📊 Using cached dates (no structure change)');
        }
        this.isCalculating = false;
        return this.cache;
      }

      if (this.debugMode) {
        console.log('📊 Recalculating all dates for', tasks.length, 'tasks');
        console.log('📊 Force recalc:', forceRecalc);
        console.log('📊 New version:', newVersion);
      }

      this.cacheVersion = newVersion;
      this.buildDependencyMap(tasks);
      const newCache = new Map();
      const processed = new Set();

      const process = id => {
        if (processed.has(id)) return;
        
        // Process dependencies first
        const deps = this.dependencyMap.get(id);
        if (deps) {
          deps.affectedBy.forEach(depId => process(depId));
        }
        
        const task = tasks.find(t => t.id === id);
        if (task) {
          const existing = Object.fromEntries(newCache);
          const dates = this.calculateTaskDates(task, tasks, projectStartDate, existing);
          newCache.set(id, dates);
          processed.add(id);
        }
      };

      // Process all tasks
      tasks.forEach(t => process(t.id));
      
      this.cache = newCache;
      
      if (this.debugMode) {
        console.log('✅ Date calculation completed. Cache size:', this.cache.size);
        // Log a few examples
        const examples = Array.from(this.cache.entries()).slice(0, 3);
        examples.forEach(([taskId, dates]) => {
          const task = tasks.find(t => t.id === taskId);
          console.log(`📅 ${task?.title || taskId}: ${dates.start_date} → ${dates.due_date}`);
        });
      }

      this.isCalculating = false;
      return this.cache;

    } catch (error) {
      console.error('❌ Error in calculateAllDates:', error);
      this.isCalculating = false;
      return this.cache;
    }
  }

  /**
   * FIXED: Better incremental updates
   * Incremental update when specific tasks change
   */
  updateTaskDatesIncremental(changedIds, tasks, projectStartDate) {
    if (!Array.isArray(changedIds)) changedIds = [changedIds];
    
    // Always force full recalculation for now to ensure correctness
    // TODO: Optimize this later once we confirm it works
    if (this.debugMode) {
      console.log('📊 Incremental update requested for:', changedIds);
      console.log('📊 Forcing full recalculation for reliability');
    }
    
    return this.calculateAllDates(tasks, projectStartDate);
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
      if (lvl > 20) break; // Prevent infinite loops
    }
    return lvl;
  }

  /**
   * FIXED: Add method to force cache invalidation
   */
  invalidateCache() {
    if (this.debugMode) {
      console.log('🗑️ Manually invalidating cache');
    }
    this.cache.clear();
    this.dependencyMap.clear();
    this.cacheVersion = '';
    this.lastTasksHash = '';
  }

  /**
   * Accessors and utilities
   */
  getTaskDates(id) { 
    const dates = this.cache.get(id);
    if (this.debugMode && !dates) {
      console.log(`⚠️ No cached dates for task: ${id}`);
    }
    return dates || null;
  }
  
  getAllDates() { 
    return Object.fromEntries(this.cache); 
  }
  
  clearCache() { 
    this.invalidateCache();
  }
  
  getCacheStats() {
    return { 
      cacheSize: this.cache.size, 
      cacheVersion: this.cacheVersion, 
      dependencyMapSize: this.dependencyMap.size, 
      isCalculating: this.isCalculating,
      lastTasksHash: this.lastTasksHash
    };
  }

  /**
   * Debug method to log current cache state
   */
  debugCacheState(label = '') {
    if (!this.debugMode) return;
    
    console.log(`🔍 Cache Debug ${label}:`);
    console.log('- Cache size:', this.cache.size);
    console.log('- Cache version:', this.cacheVersion);
    console.log('- Is calculating:', this.isCalculating);
    console.log('- Last tasks hash:', this.lastTasksHash);
    
    if (this.cache.size > 0) {
      console.log('- Sample cached dates:');
      Array.from(this.cache.entries()).slice(0, 2).forEach(([taskId, dates]) => {
        console.log(`  ${taskId}: ${dates.start_date} → ${dates.due_date}`);
      });
    }
  }
}