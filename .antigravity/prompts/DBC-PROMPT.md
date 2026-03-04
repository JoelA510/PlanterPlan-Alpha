# Design-by-Contract (DbC) Prompt

**Objective:** Enforce strict preconditions, postconditions, and invariants for
all core business logic and API interactions.

## 🛠️ Instructions

When implementing new domain logic, API clients, or state mutations:

1. **Preconditions (Requires):**
   - What must be true before this function/component executes?
   - _Action:_ Validate all inputs using Zod schemas at the boundary. Fail fast
     and throw explicitly. Do not gracefully swallow invalid data.

2. **Postconditions (Ensures):**
   - What is guaranteed to be true after execution?
   - _Action:_ Return strict types. Cast Supabase responses using the generated
     `Database` types and ensure the return value structurally matches the
     promise.

3. **Invariants (Maintains):**
   - What fundamental truths must remain unchanged?
   - _Action:_ Ensure tree structures (e.g., `root_id`) maintain their
     integrity. Use O(1) adjacency maps when modifying hierarchical data.

**Key Rule:** Document contracts in JSDoc for complex logic. Use `zod` for
runtime validation at IO boundaries (forms, API responses).
