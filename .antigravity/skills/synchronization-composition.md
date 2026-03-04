### Antigravity Skill: Synchronization Composition

**Description:** An instruction pack for refactoring original monolithic files
into lightweight composition layers after their state and mutation logic have
been extracted.

**Context:** Historically, hooks like `useProjectData.ts` fetched data from
Supabase, copied it into a local React `useState` object, and attempted to
manually synchronize it with real-time websocket events, which inherently caused
race conditions and memory leaks. This skill teaches the agent how to bridge
pure state hooks and atomic API mutations using declarative server-state
management, completely eliminating the need to duplicate server data in local
state.

#### 🎯 Objective

Refactor the original monolithic file (e.g., `useTaskTree.ts`) to act purely as
a lightweight composition layer by importing pure state hooks and mutation
functions, and using a robust server-state management library (like React Query
or SWR) to bridge the caching logic.

#### 🚦 Trigger

When Phase 1 (Pure State Extraction) and Phase 2 (Atomic API Extraction) have
been completed for a monolithic file, and the original file must now be stitched
back together to serve the UI layer.

#### 🛠️ Execution Steps

1. **Purge Manual Synchronization:**

- Strip out all instances where database payloads are manually copied into a
  local `useState` object.
- Remove all manual, imperative synchronization logic tied to `useEffect`
  websocket event listeners that attempt to update those local React states.

2. **Import Micro-Modules:**

- Import the newly created pure state hook (e.g., `useTaskTreeState`).
- Import the required atomic API utility functions (e.g., `updateTaskOrder`,
  `fetchTasks`).

3. **Server-State Integration:**

- Implement a robust server-state management library (such as React Query or
  SWR) to handle all data fetching and caching.
- Use `useQuery` (or equivalent) to wrap the atomic fetch utilities, relying
  natively on the library for cache invalidation and deduplication.

4. **Optimistic UI Enforcement (The Core Constraint):**

- Use `useMutation` (or equivalent) to wrap the extracted API mutation
  utilities.
- You MUST implement an optimistic UI update mechanism. Within the mutation
  lifecycle, define an `onMutate` handler that cancels outgoing fetches,
  snapshots the current cache, and optimistically updates the local cache.
- Define an `onError` handler that automatically rolls back the cache to the
  previous snapshot if the mutation fails.

5. **Return the Composition Interface:**

- Return a clean, combined interface containing the server data, the pure local
  state variables, and the wrapped mutation functions for the UI components to
  consume.
