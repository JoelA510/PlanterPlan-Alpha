# Debt Audit Report

**Date**: 2025-12-29
**Scope**: `src` directory, `supabase/functions`

## 1. Critical Risks (Crash / Security / Data Loss)

*None identified.* The recent fix to `import.meta.env` resolved the primary crash risk for non-Vite environments.

## 2. Correctness Risks (Logic Bugs / Reliability)

### **A. Client-Side Deep Cloning (Transactionality)**

- **File**: `src/services/taskService.js` (Lines 218-333)
- **Problem**: Project Templates are cloned using a recursive client-side function that issues sequential `INSERT` calls.
- **Risk**: If the network fails or the user closes the tab midway, the user is left with a half-cloned project (partial data). There is no database transaction wrapping this.
- **Remediation**: Move this logic to a Postgres Function (`RPC`) to ensure atomic execution (all or nothing).

### **B. Optimistic Rollback Complexity**

- **File**: `src/components/organisms/TaskList.jsx` (Lines 271-367)
- **Problem**: The `handleDragEnd` function manually manages "Shadow State" for optimistic UI updates. It attempts to revert state on failure.
- **Risk**: Concurrency issues. If a background refresh (`fetchTasks`) usually triggers during a drag, the "previous state" captured for rollback might be stale, leading to the UI reverting to an incorrect state.

### **C. Date Recalculation Overhead**

- **File**: `src/components/organisms/TaskList.jsx` (Lines 427-489)
- **Problem**: Ancestor date recalculation (Gantt-like rollup) happens in the client after every edit.
- **Risk**: Logic duplication (if we edit tasks elsewhere) and performance lag on large trees.

## 3. Maintainability Risks (Code Health)

### **A. "God Component" - TaskList.jsx**

- **File**: `src/components/organisms/TaskList.jsx`
- **Metric**: ~1,100 Lines of Code.
- **Problem**: This component handles:
    1. Data Fetching & Auth Check
    2. Drag and Drop Calculation (`dnd-kit` sensors, collision detection)
    3. Optimistic Updates
    4. Form State Management
    5. Date Logic
- **Remediation**: Extract logic into custom hooks:
  - `useTaskData` (Fetch/Mutate)
  - `useTaskDrag` (Sensors, `handleDragEnd`)

### **B. Prop Drilling**

- **Problem**: Handlers like `onEdit`, `onDelete`, `onInvite` are passed deep into `MasterLibraryList` and `TaskItem`. Context (e.g., `TaskActionContext`) could simplify the tree.

## 4. Remediation Plan

### **Phase 1: Integrity (High Priority)**

- [ ] **Move Clone to RPC**: Create `clone_project_template` SQL function to fix transactionality risk.
- [ ] **Server-Side Date Rollup**: Move date recalculation to Database Triggers.

### **Phase 2: Refactor (Medium Priority)**

- [ ] **Extract Hooks**: Break `TaskList.jsx` into `useTaskDrag.js` and `useTaskOperations.js`.
- [ ] **Context Implementation**: Introduce `TaskActionContext` to reduce prop drilling.
