# .antigravity/tasks/breakouts/03-god-object-decoupling.md

**Status:** Pending **Priority:** MEDIUM

## 🎯 Objective

Eradicate monolithic files ("God objects") that violate the Single
Responsibility Principle. Decoupling these components drastically reduces the
cognitive load and context window pollution for autonomous coding agents,
enabling safe, single-prompt iterations (IPDD) without breaking underlying data
flows.

## 🛠️ Execution Steps

### 1. Decouple `TaskBoard.tsx`

**Target:** `src/features/tasks/components/TaskBoard.tsx`

- Isolate domain business logic from the UI. Currently, this file tightly
  couples deep DOM rendering matrices with complex drag-and-drop calculation
  mathematics and database mutations.
- Extract data fetching, mutation logic, and optimistic UI updates into a custom
  hook (e.g., `useTaskBoardLogic.ts`).
- Externalize array sorting algorithms and coordinate mathematics into pure,
  highly testable functions.
- Refactor the original `TaskBoard.tsx` to serve solely as a pure presentation
  layer.

### 2. Shatter `AuthContext.tsx`

**Target:** `src/shared/contexts/AuthContext.tsx`

- Break down this massive, monolithic provider.
- Segregate the context into discrete, highly focused domains: `SessionContext`
  (for JWT and core auth status), `UserProfileContext` (for specific user data),
  and `TenantContext` (for configuration settings).
- Ensure that localized application preferences (like dark mode toggles) do not
  trigger cascading re-renders across the entire application tree.

### 3. Transition to Server-State Management

**Target:** Data-fetching hooks (e.g., `useProjectData.ts`)

- Eliminate manual, imperative state synchronization patterns where Supabase
  data is fetched and copied into a local React `useState` object.
- Prevent race conditions and memory leaks by migrating data fetching, caching,
  and real-time websocket synchronization to a declarative server-state
  management library like React Query or SWR.

## 🚦 Verification (Completion Promise)

The agent may only mark this task as complete when:

1. `TaskBoard.tsx` sorting logic can be unit-tested purely using Vitest without
   requiring a heavy DOM environment like `jsdom`.
2. Modifying a user preference via the shattered Contexts demonstrably avoids
   re-rendering the root layout.
3. The completion payload
   (`{"status": "SUCCESS", "message": "<promise>COMPLETE</promise>"}`) is
   emitted and accepted by the Ralph Loop.
