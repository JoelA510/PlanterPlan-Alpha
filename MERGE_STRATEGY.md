# ⚔️ Merge Strategy: Stabilization & Gold Master Adoption

**Context:** We are adopting the `gold-master` branch, which is the current local codebase, as the new architectural baseline due to its TypeScript integration, Data Router, and React 18 downgrade (ADR-002) which stabilizes `dnd-kit`.
**Objective:** Port critical business logic and UI features from `main` into `gold-master` before v1.0 release.

## 1. 🏗️ Architectural Baseline (The "Target")
*   **Base Branch:** `gold-master` [Local]
*   **Core Stack:** React 18.3.1, TypeScript, Vite, Tailwind v4.
*   **Key Pattern:** Recursive `TaskTree` + `TaskRow` (replaces monolithic `TaskList`).

## 2. 🚨 Critical Regressions to Remediate
*The following features exist in `main` but were lost or simplified in `gold-master`. They must be restored.*

### A. Auth Context Hardening
- [ ] **Source:** `src/app/contexts/AuthContext.jsx` (Remote Main)
- [ ] **Target:** `src/app/contexts/AuthContext.jsx` (Local)
- [ ] **Action:**
    - Restore the `callWithTimeout` wrapper around the `is_admin` RPC call.
    - **Reason:** Prevents application hang on network timeouts (Lesson [NET-006]).
    - *Constraint:* Preserve the `e2e_bypass` logic present in Local.

### B. Task Details UI Parity
- [ ] **Source:** `src/features/tasks/components/TaskDetailsView.jsx` (Remote Main)
- [ ] **Target:** `src/features/tasks/components/TaskDetails/TaskDetails.tsx` (Local)
- [ ] **Action:**
    - Restore **"Email Task"** button (generates `mailto:` link).
    - Restore **Premium/Access Badges** (visual indicators for `is_premium` / `is_locked`).
    - Restore **Rich Metadata Layout** (Type, Status, Access pills).
    - Ensure `TaskResources` and `TaskDependencies` components are imported and rendered.

### C. Project Settings Logic
- [ ] **Source:** `src/features/projects/components/EditProjectModal.jsx` (Remote Main)
- [ ] **Target:** `src/features/projects/components/EditProjectModal.jsx` (Local)
- [ ] **Action:**
    - Restore the **Date Recalculation Warning** UI (Amber alert box).
    - Restore the **"Danger Zone"** UI layout for project deletion.

## 3. 🛡️ Data Integrity & Schema
- [ ] **Type Sync:** Run Supabase type generator to ensure `src/shared/db/types.ts` matches `docs/db/schema.sql` exactly.
- [ ] **Schema Check:** Verify `task_resources` table exists and RLS policies match `Remote Main`.

## 4. 🧪 Verification Protocol (The "Definition of Done")

### Automated Gates
1.  **Linting:** `npm run lint` (Must be clean, 0 errors).
2.  **Unit Tests:** `npm test` (All Vitest suites pass).
3.  **E2E Smoke:** `npx playwright test e2e/v2-golden.spec.ts` (Must pass).

### Agentic Visual Verification
*Execute via Browser Subagent:*
1.  **Drag & Drop:** Verify dragging a task does *not* crash the app (confirms React 18 downgrade).
2.  **Cycle Detection:** Attempt to drop a Parent Task into its own Child. Verify it is blocked.
3.  **Task Details:** Click a task. Verify "Email Task" button is visible.

---

## 5. Execution Plan (Copy to `tasks/todo.md`)

```markdown
- [ ] **Step 1: Environment Prep**
    - [ ] Checkout `gold-master` branch.
    - [ ] Verify `package.json` has `"react": "^18.3.1"`.
    - [ ] Run `npm install`.

- [ ] **Step 2: Auth Logic Port**
    - [ ] Open `src/app/contexts/AuthContext.jsx`.
    - [ ] Implement `callWithTimeout` helper from Main.
    - [ ] Wrap `is_admin` RPC call in try/catch with timeout.

- [ ] **Step 3: Task Details Restoration**
    - [ ] Open `src/features/tasks/components/TaskDetails/TaskDetails.tsx`.
    - [ ] Add "Email Task" button logic.
    - [ ] Add `is_premium` / `is_locked` badges.
    - [ ] Re-integrate `TaskResources` component.

- [ ] **Step 4: Project Settings Restoration**
    - [ ] Open `src/features/projects/components/EditProjectModal.jsx`.
    - [ ] Add Date Recalculation warning block.
    - [ ] Style "Danger Zone" to match Main.

- [ ] **Step 5: Final Verification**
    - [ ] Run `npm run lint`.
    - [ ] Run `npx playwright test`.
```