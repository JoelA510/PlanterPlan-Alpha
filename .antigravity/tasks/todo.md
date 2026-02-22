# Current Task & Execution Plan: Gold Master Integration (v1.1 Delta)

## 📍 Current Objective
> **Summary:** Address the deep architectural regressions discovered in the `main` vs `gold-master` analysis while preserving FSD and TypeScript improvements.
> **Status:** `READY`

---

## ✅ Phase 1: Network Stability (The ADR-2 Fix) (COMPLETED)
*Context: `gold-master` introduced `@supabase-cache-helpers` which bypasses our custom `rawSupabaseFetch` timeout/abort protections defined in `planterClient.js`.*
- **Pre-Check:** Establish **Rollback Strategy**: Backup current `useTasks.ts` and `useMembers.ts` state. If regressions escalate, `git checkout HEAD -- <files>` immediately.
- **Analyze:** Review `src/features/tasks/hooks/useTasks.ts` and `src/features/members/hooks/useMembers.ts`.
- **Refactor:** Remove `@supabase-cache-helpers/postgrest-react-query`. Revert these hooks to use standard `@tanstack/react-query` combined with the safe `planter.entities.*` fetchers from `src/shared/api/planterClient.js`. Ensure adherence to `[NET-005] Transient Network Abort Resilience` and optimistic UI protections.
- **Cleanup:** Run `npm uninstall @supabase-cache-helpers/postgrest-react-query`.

## ✅ Phase 2: Theme Restoration (COMPLETED)
*Context: The refactor hardcoded the theme to light mode.*
- **Restore:** Open `src/app/contexts/ThemeContext.jsx`.
- **Fix:** Remove the hardcoded `const theme = 'light';` and empty `setTheme` functions. Restore the `localStorage` and `window.matchMedia` system preference logic from the `main` branch.
- **Audit (Blue Phase):** Trigger **Anti-Gravity Preview** to perform a visual check against the "Modern Clean SaaS" aesthetic `[UI-025] Theme-Reactive Surface Standardization`. Ensure semantic variables (e.g., `bg-slate-50`, `bg-brand-500`) bind correctly in Dark Mode.

## ✅ Phase 3: Task Details Completion (COMPLETED)
*Context: The initial restoration missed several text fields.*
- **Update:** Open `src/features/tasks/components/TaskDetails/TaskDetails.tsx`.
- **Add Fields:** Ensure the UI renders the `purpose`, `actions`, `notes`, `start_date`, and `due_date` fields from the task object (matching the layout previously found in `TaskDetailsView.jsx`).
- **Constraint Check:** Enforce **Zero FSD Violations**. Date additions MUST be handled exclusively via `src/shared/lib/date-engine` per `[ARC-034]`. Validate field names strictly match database entities per `[FE-045]`.

## ✅ Phase 4: Security Test Restoration (COMPLETED)
*Context: Critical security boundary tests were deleted in the refactor.*
- **Restore (Red):** Retrieve the following files from the `main` branch history and place them in the `gold-master` tree:
    - `src/tests/security/RLS.test.js`
    - `src/tests/unit/XSS.test.jsx`
    - `src/tests/unit/RPCHardening.test.js`
- **Implement (Green):** Resolve any test failures caused by the `gold-master` architectural shifts until all pass (`npm test`).
- **Refactor (Yellow):** Analyze test code to ensure it respects the `[SEC-002/043]` and `[SEC-044]` lessons.

## ✅ Phase 5: Verification & Release
- **Modernity Audit & Lint:** Run `npm run lint` to ensure zero warnings (`max-warnings=0` constraint).
- **E2E Stability (Hybrid Verification):** Utilize the Agentic E2E testing protocol. Execute the `/verify-e2e` workflow instead of a blind headless run, isolating `e2e/v2-golden.spec.ts` inside the bounded agent loop to handle any unpredicted `gold-master` race conditions.