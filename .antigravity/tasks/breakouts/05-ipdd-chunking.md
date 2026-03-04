# .antigravity/tasks/breakouts/05-ipdd-chunking.md

**Status:** Pending **Priority:** LOW

## 🎯 Objective

Fully support Iterative Prompt-Driven Development (IPDD) by fracturing massive,
monolithic real-time hooks into isolated, highly cohesive micro-modules. This
prevents the AI agent from experiencing "context saturation," which leads to
hallucinated variables and accidental regressions when orchestrating complex
state updates across localized and remote data structures simultaneously.

## 🛠️ Execution Steps

### 1. Phase 1: State Segregation

**Target:** `src/features/tasks/hooks/useTaskTree.ts` and
`src/features/projects/hooks/useProjectRealtime.ts`

- Identify and extract purely local state management, such as drag-and-drop
  coordinate mathematics or tree node expansion tracking.
- Relocate this logic into isolated custom hooks (e.g., `useTaskTreeState.ts`).
- Ensure these hooks operate purely on local React state and accept unit tests
  without requiring a mocked database connection.

### 2. Phase 2: Mutation Extraction

**Target:** Monolithic hooks containing inline Supabase calls.

- Relocate all Supabase interaction logic out of these hooks and into discrete,
  atomic API utility functions (e.g., `updateTaskParent.ts`,
  `reorderTaskSiblings.ts`).
- Heavily guard these new API functions with the previously established runtime
  Zod contracts to ensure data integrity.

### 3. Phase 3: Synchronization Composition

**Target:** The original monolithic files (`useTaskTree.ts`,
`useProjectRealtime.ts`).

- Refactor these files to act purely as lightweight composition layers.
- Strip out the old logic and simply import the pure state hooks and atomic
  mutation functions.
- Utilize a robust server-state management library (like React Query or SWR) to
  bridge the caching and synchronization logic between them.

## 🚦 Verification (Completion Promise)

The agent may only mark this task as complete when:

1. The isolated pure state hooks possess passing unit tests that do not mock or
   import `@/lib/supabase`.
2. The original monolithic hooks contain absolutely no direct `useState` calls
   for tracking remote data, nor any inline `supabase.from()` calls.
3. The completion payload
   (`{"status": "SUCCESS", "message": "<promise>COMPLETE</promise>"}`) is
   emitted and accepted by the external Ralph Loop validation script.
