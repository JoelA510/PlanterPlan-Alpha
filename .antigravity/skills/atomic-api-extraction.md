### Antigravity Skill: Atomic API Utility Extraction

**Description:** An instruction pack for relocating database interactions out of
UI components and monolithic hooks into highly isolated, contract-driven API
utilities.

**Context:** The application currently suffers from implicit state assumptions
where database payloads are not validated at runtime. This skill teaches the
agent to extract mutations and strictly enforce Design-by-Contract (DbC)
principles, ensuring malformed AI-generated payloads fail immediately rather
than corrupting the database.

#### 🎯 Objective

Extract all Supabase interaction logic into discrete, atomic API utility
functions (e.g., `updateTaskParent.ts`, `reorderTaskSiblings.ts`) heavily
guarded by runtime Zod contracts.

#### 🚦 Trigger

When tasked with refactoring a monolithic God object (like `TaskBoard.tsx`) or a
real-time sync hook that contains inline `supabase.from()` calls mixed with
business or UI logic.

#### 🛠️ Execution Steps

1. **Mutation Identification:**

- Scan the target file for any direct imports from `@/lib/supabase` or direct
  database mutation methods (`.insert()`, `.update()`, `.delete()`).

2. **Utility Extraction:**

- Create a new file in the appropriate domain API folder:
  `src/features/[domain]/api/[actionName].ts` (e.g.,
  `src/features/tasks/api/createTask.ts`).
- Move the isolated Supabase interaction logic into this new file.

3. **DbC Enforcement (The Core Constraint):**

- **Preconditions:** You MUST define a Zod schema for the expected input (e.g.,
  `CreateTaskInputSchema`). Fail fast by parsing the incoming `taskData` against
  this schema before the Supabase call executes.
- **Postconditions:** You MUST define a Zod schema for the expected output
  (e.g., `TaskSchema`). Guarantee the returned state matches application
  expectations by parsing the Supabase response payload before returning it to
  the main thread.
- **Absolute Ban:** You are strictly forbidden from trusting the raw `data`
  object returned by Supabase or using the `as SomeType` assertion pattern.

4. **Error Handling:**

- Wrap the execution in a `try/catch` block. If the database returns an error,
  explicitly throw a highly descriptive `Error` containing the exact database or
  Zod validation failure message to feed back into the ReAct observation loop.

5. **Composition Refactoring:**

- Return to the original monolithic file.
- Delete the inline Supabase logic and import the new atomic API utility
  function.
