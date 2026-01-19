# System Architecture & Component Design

## 1. Project Module Architecture

The `Project` module (`src/pages/Project.jsx`) has been refactored from a monolithic "God Component" into a composition of specialized hooks and UI components.

### Component Diagram

```mermaid
graph TD
    subgraph Page [Project Page Layer]
        PageComp[Project.jsx]
        Tabs[ProjectTabs.jsx]
        Header[ProjectHeader.jsx]
    end

    subgraph Logic [Business Logic Layer]
        Hook[useProjectData.js]
        Sub[useTaskSubscription.js]
    end

    subgraph Feature [Feature Widgets]
        Board[Task Board UI]
        Budget[BudgetWidget]
        People[PeopleList]
        Assets[AssetList]
    end

    PageComp -->|Data Consumption| Hook
    PageComp -->|Realtime Events| Sub
    
    PageComp -->|Renders| Header
    PageComp -->|Renders| Tabs
    
    PageComp -->|Conditional Render| Board
    PageComp -->|Conditional Render| Budget
    PageComp -->|Conditional Render| People
    PageComp -->|Conditional Render| Assets

    Hook -->|Fetches| Supabase[(Supabase DB)]
```

### Key Decisions
- **Data Isolation**: `useProjectData` handles all `useQuery` calls for project metadata, hierarchy, and members. The view component (`Project.jsx`) receives clean data objects, not raw query results.
- **Tab State**: `ProjectTabs` encapsulates the navigation UI, allowing the parent to simply manage the `activeTab` string state.

---

## 2. Task List Architecture

The `TaskList` (`src/features/tasks/components/TaskList.jsx`) serves as the main application dashboard logic. It uses a Facade Pattern to manage complexity.

### Component Diagram

```mermaid
graph TD
    subgraph Container [TaskList Container]
        List[TaskList.jsx]
        Sidebar[ProjectSidebar]
        MainView[ProjectTasksView]
        Details[TaskDetailsPanel]
        Empty[NoProjectSelected]
    end

    subgraph Facade [Logic Facade]
        Hook[useTaskBoard Hook]
    end

    subgraph Internals [Internal Hooks]
        Drag[useTaskDrag]
        Ops[useTaskOperations]
    end

    List -->|Delegates Logic| Hook
    Hook -->|Composes| Drag
    Hook -->|Composes| Ops

    List -->|Renders| Sidebar
    List -->|Renders| MainView
    List -->|Renders| Details
    List -->|Renders| Empty
```

### Key Decisions
- **Panel Extraction**: The right-side details panel logic was moved to `TaskDetailsPanel` to declutter the main render method.
- **Empty State**: `NoProjectSelected` handles the "zero state" when no project is active, separating it from the main view logic.

---

## 3. Real-time Data Flow

We use a "Stale-While-Revalidate" strategy enhanced by Supabase Realtime-triggered invalidations.

```mermaid
sequenceDiagram
    participant Client A
    participant Supabase DB
    participant Client B

    Client A->>Supabase DB: INSERT / UPDATE Task
    Supabase DB-->>Client A: Success (Optimistic UI confirms)
    
    par Realtime Broadcast
        Supabase DB->>Client B: Postgres Change Event (INSERT)
    end

    Client B->>Client B: useTaskSubscription receives event
    Client B->>Client B: queryClient.invalidateQueries(['projectHierarchy'])
    Client B->>Supabase DB: Refetch fresh data
    Supabase DB-->>Client B: Return updated Task Tree
```
