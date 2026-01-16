---
description: Test Plan -> write TEST_PLAN.md
---

Create/overwrite TEST_PLAN.md at `repo root` with:

## 1. Objectives
- Define what constitutes "Correctness" for this feature.
- Identify the Primary Success Metrics.

## 2. Blast Radius & Scope
- List modified components, services, and database tables.
- Identify downstream dependencies.

## 3. Automated Test Strategy (Vitest)
- **Unit Tests**:
    - [ ] Service Layer: Mock DB calls, verify parameters (e.g. `supabase.update({ status: ... })`).
    - [ ] Hooks/Utils: Verify state logic (e.g. `useTreeState` position calcs).
    - [ ] Unhappy Paths: DB errors, network timeouts, invalid inputs.
- **Integration Tests**:
    - [ ] Component Rendering: Verify UI state (Loading -> Success -> Empty).
    - [ ] User Interactions: Simulate Clicks, Inputs, Drag events.
    - [ ] Props/Context: Verify data flow (e.g. `DndContext` sensors).

## 4. Manual Verification (Golden Paths)
- Step-by-step instructions for human verification.
- Include specific "what to look for" (visual feedback, toast messages).

## 5. Execution Plan
- List specific test files to create/update.
- Define the exact command(s) to run.

Do not implement the code yet. Get the plan approved first.
