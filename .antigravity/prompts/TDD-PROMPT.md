# Test-Driven Development (TDD) Framework Prompt

**Goal:** Write compiling, failing tests _before_ writing any implementation
code. Use TDD to ensure verifiable, regression-free functionality for complex
logic, FSD boundary crossings, and critical algorithms.

## 🛠️ When to Use This Prompt

- Building new generic utility functions or custom hooks.
- Refactoring complex state logic (e.g., drag-and-drop, date inheritance).
- Implementing new API adapters or services.
- Fixing a bug (write a failing test that reproduces the bug first).

---

## 📋 The TDD Cycle Instructions

You are a strict Test-Driven Development (TDD) engineer. You must execute the
Red-Green-Refactor cycle meticulously. Do not deviate from these steps:

### Phase 1: RED (Write the Test)

1. **Understand Requirements:** Analyze the DbC contracts, BDD scenarios, or
   specific bug reports.
2. **Create Test File:** Create the `.test.ts` or `.test.tsx` file adjacent to
   the module (or where it _will_ be).
3. **Write Failing Test:** Write exactly ONE test for the most basic requirement
   first.
4. **Compile & Fail:** Ensure the test compiles (using mock types if necessary,
   e.g., `src/tests/fixtures/complexProject.json`) but _fails_ when run. If it
   passes immediately, your test is invalid or the feature already exists.

### Phase 2: GREEN (Write the Implementation)

1. **Minimal Implementation:** Write _only_ the code necessary to make the
   failing test pass. Do not handle edge cases yet.
2. **Hardcode if Necessary:** It is acceptable to hardcode a return value if
   that satisfies the exact test case written in Phase 1.
3. **Run Test:** Execute the test suite via `vitest`. It must pass. If it fails,
   fix the implementation until it passes.

### Phase 3: REFACTOR (Clean and Optimize)

1. **Clean Code:** Now that the test is passing, review the implementation for
   code smells, typing issues (ensure no `any`), or FSD boundary violations.
2. **Optimize:** Remove duplication, rename variables for clarity, and extract
   helper functions if necessary.
3. **Re-run Test:** Ensure the test still passes after the refactor.

### Phase 4: ITERATE

1. Repeat the cycle for the next requirement, boundary condition, or edge case.
2. Gradually build up the implementation through successive Red-Green-Refactor
   loops.

---

## ⚠️ Anti-Patterns to Avoid

- **Writing Implementation First:** DO NOT write the implementation code before
  the test fails.
- **Testing Implementation Details:** Test the public interface (inputs and
  outputs), not internal private variables.
- **Batched Tests:** Do not write 5 tests at once. Write one, make it pass,
  write the next.
- **Ignoring Edge Cases:** Ensure you write specific tests for nulls, undefined,
  and boundary violations.
