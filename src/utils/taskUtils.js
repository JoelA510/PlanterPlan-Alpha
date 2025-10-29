// ──────────────────────────────────────────────────────────────
// src/utils/taskUtils.js
// ──────────────────────────────────────────────────────────────
//
// Robust date helpers first, followed by existing colour / nesting /
// scheduling utilities (unchanged).
// ──────────────────────────────────────────────────────────────

/**
 * Turn any “date-like” input into a real `Date`.
 * Accepts:
 *   • Date                → returns it (if valid)
 *   • ISO / YYYY-MM-DD    → parses
 *   • Timestamp (number)  → converts
 * Returns `null` when parsing fails.
 */
export const toDate = (value) => {
  if (!value) return null;

  // Already a Date?
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Unix timestamp or JS epoch?
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // String: try built-in parser first
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed);

    // Fallback for bare “YYYY-MM-DD” or “YYYY/MM/DD”
    const parts = value.split(/[-/]/);
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      const fallback = new Date(y, m - 1, d);
      return isNaN(fallback.getTime()) ? null : fallback;
    }
  }

  return null;
};

/**
 * Display helper used by TaskItem / TaskDetailsPanel.
 *   ➜  Fri, Jul 18, 2025
 *
 * Accepts anything `toDate` accepts.
 * Returns the literal string “Invalid date” if parsing fails.
 */
export const formatDisplayDate = (input, locale = 'en-US') => {
  const date = toDate(input);
  if (!date) return 'Invalid date';

  return date.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Simpler legacy wrapper kept for callers that just need a local date.
 * Falls back to “N/A” when no value provided or parsing fails.
 */
export const formatDate = (input) => {
  const date = toDate(input);
  return date ? date.toLocaleDateString() : 'N/A';
};

// ───────────────── colours & nesting helpers ─────────────────

export const filterOutLeafTasks = (tasks = []) => {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }

  const parentsWithChildren = new Set();

  tasks.forEach((task) => {
    if (task?.parent_task_id) {
      parentsWithChildren.add(task.parent_task_id);
    }
  });

  return tasks.filter((task) => !task?.parent_task_id || parentsWithChildren.has(task.id));
};

export const getBackgroundColor = (level) => {
  const colours = [
    '#6b7280', // top level
    '#1e40af',
    '#2563eb',
    '#3b82f6',
    '#60a5fa',
    '#93c5fd', // level ≥5
  ];
  if (level === 0) return colours[0];
  return level < colours.length ? colours[level] : colours[colours.length - 1];
};

export const getTaskLevel = (task, tasks) => {
  if (!task.parent_task_id) return 0;

  let level = 1;
  let parentId = task.parent_task_id;
  while (parentId) {
    level++;
    const parent = tasks.find((t) => t.id === parentId);
    parentId = parent?.parent_task_id;
  }
  return level;
};

export const isDescendantOf = (potentialChild, potentialParentId, tasks) => {
  let current = potentialChild;
  while (current && current.parent_task_id) {
    if (current.parent_task_id === potentialParentId) return true;
    current = tasks.find((t) => t.id === current.parent_task_id);
  }
  return false;
};

// ───────────────── scheduling utilities ──────────────────────

export const calculateDueDate = (startDate, durationDays) => {
  if (!startDate || !durationDays) return null;
  const due = new Date(startDate);
  due.setDate(due.getDate() + durationDays);
  return due;
};

export const calculateStartDate = (parentStartDate, position, siblingTasks) => {
  if (!parentStartDate) return new Date(); // top-level fallback

  const sortedSiblings = [...siblingTasks].sort((a, b) => a.position - b.position);

  let start = new Date(parentStartDate);
  for (let i = 0; i < position; i++) {
    if (i < sortedSiblings.length) {
      const dur = sortedSiblings[i].default_duration || 1;
      start.setDate(start.getDate() + dur);
    }
  }
  return start;
};

export const updateChildDates = (tasks, parentId, parentStartDate) => {
  const children = tasks
    .filter((t) => t.parent_task_id === parentId)
    .sort((a, b) => a.position - b.position);

  if (children.length === 0) return tasks;

  let updated = [...tasks];
  let cursor = new Date(parentStartDate);

  children.forEach((child) => {
    const start = new Date(cursor);
    const duration = child.default_duration || 1;
    const due = calculateDueDate(start, duration);

    updated = updated.map((t) =>
      t.id === child.id ? { ...t, start_date: start, due_date: due } : t
    );

    cursor.setDate(cursor.getDate() + duration);

    // recurse for grandchildren
    updated = updateChildDates(updated, child.id, start);
  });

  return updated;
};
