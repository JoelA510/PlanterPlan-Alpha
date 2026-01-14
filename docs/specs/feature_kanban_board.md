# Feature Spec: Kanban Board View

## 1. Overview
Implementing a true Kanban Board view (Columns: To Do, In Progress, Blocked, Done) as an alternative to the current List View. This addresses the "Board View" UX gap identified during verification.

## 2. Component Architecture
We will introduce a `ViewSwitcher` in `ProjectTasksView` to toggle between `ListView` (current) and `BoardView` (new).

### New Components
1.  **`ProjectBoardView.jsx`**: Main container.
    -   Uses `DndContext` (shared or specific configuration).
    -   Layout: Horizontal flex container of `BoardColumn`.
2.  **`BoardColumn.jsx`**:
    -   Props: `status`, `tasks`, `id`.
    -   Logic: Filters tasks by status.
    -   DropTarget: Accepts items dropped into the empty space.
3.  **`BoardTaskCard.jsx`**:
    -   A simplified version of `TaskItem` optimized for cards (less horizontal width, more vertical information density).

## 3. Data Flow & Drag Logic
The existing `useTaskDrag` hook needs adaptation:
-   **Current Logic**: Vertical reordering (List).
-   **New Logic**:
    -   **Cross-Column Drag**: Changes `status` AND calculated `position`.
    -   **Same-Column Drag**: Changes `position` only.

### State Updates
-   **On Drop**:
    1.  Determine Target Column (Status).
    2.  Calculate New Position within that column.
    3.  Optimistic Update: Update `tasks` state with new Status + Position.
    4.  API Call: `updateTaskStatus` AND `updateTaskPosition`.

## 4. Implementation Steps
1.  **Refactor**: Extract current list logic into `ProjectListView.jsx`.
2.  **Scaffold**: Create `ProjectBoardView` with static columns.
3.  **DND Integration**: Connect `useTaskDrag` to handle status changes on drop.
4.  **UI**: Style columns with `bg-slate-50`, rounded corners, and sticky headers.

## 5. Risks
-   **Mobile**: Horizontal scrolling boards are tricky on mobile. May force "Stack View" or keep List View as default on mobile.
-   **Performance**: Rendering 100+ tasks in flex columns might require virtualization if not paginated.
