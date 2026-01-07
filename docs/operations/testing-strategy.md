# Testing Strategy

## Test Layers

### 1. Unit Tests (Strict)

- **Focus:** Pure logic (Date math, Tree recursion, ID generation).
- **Tool:** Jest (`npm test`).
- **Location:** `src/utils/*.test.js`.
- **Mandatory:** Any change to `dateUtils.js` requires a passing regression test suite covering Leap Years and Timezone boundaries.

### 2. Integration Tests (Mocked)

- **Focus:** Service layer interacting with Supabase.
- **Tool:** Jest with `jest.mock`.
- **Location:** `src/services/*.test.js`.
- **Requirement:** Must verify that `AbortController` signals are passed to the client.

### 3. Linting as Law

- **Command:** `npm run lint`
- **Policy:** Zero Tolerance. `max-warnings=0`.
- **Why:** React Hook dependencies are critical for preventing stale closures in DND handlers.

### 4. Golden Path E2E (Browser Agent)

- **Focus:** User-centric verification of critical flows (Create Project -> Create Task -> Edit -> Verify Persistence).
- **Tool:** Browser Subagent.
- **Requirement:** Must be run before any PR merge or major release.
- **Why:** Manual testing is prone to fatigue; the Browser Agent rigorously checks "Happy Paths" and catches subtle database regressions (like RLS/Trigger failures) that unit tests miss.

## Manual Verification (The "Human Check")

For features involving Drag-and-Drop:

1. Open two browser windows.
2. Drag an item in Window A.
3. Verify it moves in Window B (Realtime/Refetch).
4. Disconnect Network -> Drag -> Verify Rollback on Reconnect/Error.

---

## Appendix A: RAG Verification Profile (Phase 7)

### 1. Security & Leakage (Automated/Manual)

- **RLS Check**: Verify `rag_get_project_context` returns 0 rows for a user not in the project.
- **Cross-Project Isolation**: Create two projects. Ensure search in Project A never returns chunks from Project B.
- **Secret Injection**: Attempt to inject prompt overrides in task notes; verify system refuses to follow them.

### 2. Retrieval Quality (Manual Eval)

- Run the queries defined in `docs/ai/RAG_EVAL.md`.
- **Pass Criteria**:
  - "Summarize project": Returns valid JSON summary of tasks.
  - "Unknown fact": Returns "Insufficient evidence" (no hallucination).
  - Citations: Every answer must include `[source: task-id]` or `[source: resource-id]`.

### 3. Performance

- **Latency**: End-to-end answer generation < 5s (p90).
- **Budget**: Max 24k chars retrieved context.
