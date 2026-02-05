# Current Task & Execution Plan

## 📍 Current Objective
> **Summary:** Establish a Reliability Baseline by addressing Top 3 Hotspots.
> **Status:** `PLANNING`

---

## 🔍 Phase 1: Context & FSD Check
*Before implementation, validate the environment.*

- [x] **Golden Paths Baseline:**
    - *Result:* 6/6 Passed.
    - *Warning:* `[PlanterClient] auth.me() called - falling back to direct fetch` (Investigate in Hotspot #3).
- [x] **Hotspot Identification:**
    - *Source:* `master_remediation_plan.md` & `tasks/lessons.md`.

---

## 🧠 Phase 2: Reliability Hotspots (The "Fix" List)
*Top 3 Areas causing recent instability.*

### 🔥 Hotspot 1: Network Resilience (Abort/Retry)
- **Problem:** `AbortError`s during rapid navigation or strict-mode double-invokes cause UI freezes or dropped writes.
- **Evidence:** Lessons [NET-005], [REACT-040], [NET-006].
- **Target:** Implement `shared/lib/retry` wrapper and wrap `supabaseClient` methods.

### 🔥 Hotspot 2: Optimistic UI Synchronization
- **Problem:** `useTaskBoard` optimistic updates do not "snap back" reliably on failure, leaving the board in an invalid state.
- **Evidence:** Master Plan P1 (Optimistic UI Race Condition), Lesson [UI-016].
- **Target:** Refactor `handleStatusChange` to use valid rollback mechanism.

### 🔥 Hotspot 3: Auth Context Stability
- **Problem:** Infinite loops in `ViewAsContext` and fragile fallback logic in `auth.me()`.
- **Evidence:** Master Plan P0 (Auth Role Fallback), P1 (ViewAs Loop), Test Warning logs.
- **Target:** Harden `AuthProvider` and `ViewAsContext` against race conditions.

---

## 🛠️ Phase 3: Implementation (TDD Cycle)
*Select a Hotspot to attack.*

- [x] **Attack Hotspot 1 (Network):**
    - `retry` utility created? [x]
    - `supabaseClient` wrapped? [x]
- [x] **Attack Hotspot 2 (Optimistic UI):**
    - `useTaskBoard` refactored? [x]
    - Drag-fail-revert verified? [x]
- [x] **Attack Hotspot 3 (Auth):**
    - `AuthContext` loop fixed? [x]
    - Warning logs silenced? [x]

---

## ✅ Phase 4: Verification & Impact Audit
- [x] **Regression Test:** Run `golden-paths.test.jsx` again.
- [x] **Manual Chaos:** Throttle network -> Verify Retry.
- [x] **Documentation:** Update `tasks/lessons.md` with new stability patterns.

---

## 📂 Archive
### Completed: Reliability Baseline (Feb 3)
- [x] **Plan:** [master_remediation_plan.md](master_remediation_plan.md)
- [x] **Hotspot 1 (Network):** `retry` utility & client wrapping.
- [x] **Hotspot 2 (Optimistic UI):** `useTaskBoard` rollback fix.
- [x] **Hotspot 3 (Auth):** `AuthContext` consolidation.
- [x] **Verification:** 6/6 Golden Paths Passed.

*(Completed tasks go here)*