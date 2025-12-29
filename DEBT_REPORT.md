# Tech Debt Report

**Generated**: 2025-12-29  
**Branch**: `main` @ `1de99c9`

---

## 1. Critical (Crash / Security / Data Loss)

| File | Location | Issue | Suggested Fix |
|------|----------|-------|---------------|
| `supabase/functions/rag-answer/index.ts` | L143 | Error handling returns `400` for all errors, unlike `invite-by-email` which differentiates 400 vs 500. Inconsistent API behavior. | Apply same pattern: check `error.message?.includes("not set in environment")` to return 500 for server config errors. |
| `recovery/schema.sql` | L245-277 | 5 functions use `SECURITY DEFINER` without explanatory comments. Purpose unclear for future developers. | Either add comments explaining need, or migrate to documented RPC in `supabase/migrations/`. |

---

## 2. Correctness Risks (Logic Bugs / Missing Validation)

| File | Location | Issue | Suggested Fix |
|------|----------|-------|---------------|
| `src/services/taskService.js` | L234-250 | `deepCloneTask` passes `null` for optional params if not provided, but RPC expects `DEFAULT NULL`. Works but is fragile. | Explicitly omit keys with `undefined` values instead of sending `null`. |
| `src/hooks/useTaskOperations.js` | L195-210 | `createTaskOrUpdate` has `days_from_start` logic that may not sync with DB triggers. Potential double-calculation. | Clarify ownership: either client OR trigger calculates dates, not both. |

---

## 3. Maintainability (Large Functions / Deep Nesting / Duplication)

| File | Location | Issue | Suggested Fix |
|------|----------|-------|---------------|
| `src/components/organisms/TaskList.jsx` | 447 lines | Still large despite refactor. Contains 150+ lines of JSX rendering. | Extract rendering sections (`ProjectList`, `TemplateList`, `JoinedList`) into sub-components. |
| `src/services/taskService.js` | 286 lines | Service file with many responsibilities: CRUD, clone, search, batch. | Split into `taskService.js` (CRUD), `taskCloneService.js`, `taskSearchService.js`. |
| `recovery/` folder | Entire folder | Legacy Python scripts for data recovery. Not part of active development. | Archive to separate branch or delete if no longer needed. |
| `docs/db/schema.sql` | L245-277 | Duplicate of `recovery/schema.sql`. Stale: may not match current production. | Consolidate into one authoritative source or regenerate from live DB. |

---

## 4. Remediation Plan

### Phase 1: Quick Wins (< 1 hour)

1. **Apply 500 error handling to `rag-answer`** - Copy pattern from `invite-by-email`.
2. **Add SECURITY DEFINER comments** - Annotate all 5 functions in legacy schema files.
3. **Archive or delete `recovery/` folder** - Move to `archive/` branch or remove.

### Phase 2: Service Layer Cleanup (2-4 hours)

1. **Split `taskService.js`** into focused modules.
2. **Clarify date calculation ownership** - Document whether DB triggers or client handles `days_from_start`.

### Phase 3: Component Refinement (4+ hours)

1. **Extract rendering sub-components from `TaskList.jsx`**.
2. **Consolidate schema documentation** - Single source of truth for DB schema.

---

## Summary

| Category | Count |
|----------|-------|
| Critical | 2 |
| Correctness | 2 |
| Maintainability | 4 |
| **Total** | **8** |

Most issues are **low-severity maintainability** improvements. No blocking bugs or security vulnerabilities remain after the recent CORS and error handling fixes.
