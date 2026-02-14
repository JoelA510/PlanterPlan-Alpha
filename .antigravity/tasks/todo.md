# Current Task & Execution Plan

## 📍 Current Objective
> **Summary:** Execute "Deep Research" Testing Strategy (Regression Gating)
> **Status:** `IN_PROGRESS`

---

## 🔍 Phase 1: Foundation & Factories
- [ ] **Scaffold:** Create `src/shared/test/factories` (Task, Project, User).
- [ ] **Scaffold:** Create `renderWithProviders` helper in `src/shared/test/utils.jsx`.
- [ ] **Audit:** Verify `vitest` config supports the "no network" default rule.

## 🧠 Phase 2: Core Domain Logic (P0 Unit)
- [ ] **Tree Model:** Backfill tests for `buildTree` and `fetchTaskChildren` (deterministic).
- [ ] **Deep Clone:** Verify `deepCloneTask` preserves structure and resets IDs.
- [ ] **RLS Service:** Mocked integration tests for `projectService` permission handling.

## 🛡️ Phase 3: E2E Hardening (Playwright)
- [ ] **Smoke Suite:** Refactor `e2e/golden-paths.spec.ts` to match the "Smoke" definition in the strategy.
- [ ] **Selectors:** Audit and add `data-testid` to Sidebar, TaskList, and PhaseCard.
- [ ] **Config:** Ensure CI config matches the "Fast Fail" design.
