# Debt Report
**Date**: 2026-01-18

## 1. Critical Issues (0)
*None identified*

## 2. Correctness & Hygiene Risks
### Active Console Logs
- [x] `src/features/tasks/hooks/useTaskSubscription.js`: Removed active `console.log` statements.

## 3. Maintainability Issues
### Large Components (>300 lines)
High priority for splitting to improve readability and testability.

- [x] `src/features/tasks/components/TaskItem.jsx`: Decomposed into `TaskStatusSelect` and `TaskControlButtons`, reducing main file size by ~40%.

- [x] `src/pages/Reports.jsx`: Extracted `StatusPieChart` and `PhaseBarChart`, significantly simplifying the main view.

- [x] `src/pages/Project.jsx`: Logic extracted to `useProjectData.js` and `ProjectTabs.jsx`, fixing "God Component" status.

- [x] `src/features/tasks/components/TaskList.jsx`: Decomposed logic into `TaskDetailsPanel` and `NoProjectSelected`, cleaning up the container.
