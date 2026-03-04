### Antigravity Skill: Pure State Hook Extraction

**Description:** An instruction pack for aggressively fracturing monolithic God
objects by isolating purely local React state into highly cohesive, testable
custom hooks.

**Context:** Massive files like `useTaskTree.ts` concurrently manage remote
synchronization, database mutations, and local UI state, which leads to AI
context saturation and accidental regressions. This skill teaches the agent how
to safely extract the UI state layer.

#### 🎯 Objective

Extract purely local state management (e.g., tree node expansion tracking,
drag-and-drop coordinate mathematics, UI toggles) from a monolithic file into an
isolated custom hook (e.g., `useTaskTreeState.ts`).

#### 🚦 Trigger

When tasked with refactoring a monolithic component or hook that exceeds 200
lines and mixes `supabase` imports with `useState` UI tracking.

#### 🛠️ Execution Steps

1. **State Identification:** * Scan the target monolithic file for `useState` or
   `useReducer` implementations that do not directly interact with database
   payloads.

- Identify complex mathematical or UI-centric state (e.g., drag-and-drop logic,
  sorting math, expansion states).

2. **Hook Segregation:**

- Create a new file named `use[Domain]State.ts` (e.g., `useTaskTreeState.ts`).
- Move the identified local state, along with its specific updater functions and
  handlers, into this new hook.

3. **Purity Enforcement (The Core Constraint):**

- The new hook MUST operate purely on local React state.
- **Absolute Ban:** You are strictly forbidden from importing `@/lib/supabase`,
  `React Query`, `SWR`, or any external API utility into this file.

4. **Testability Verification:**

- The hook must be fully testable without requiring a mocked database
  connection.
- Write a corresponding Vitest suite (`use[Domain]State.test.ts`) that asserts
  the hook's output based purely on provided inputs.

5. **Composition Refactoring:**

- Return to the original monolithic file.
- Delete the extracted state logic and import the new pure state hook to act as
  a lightweight composition layer.
