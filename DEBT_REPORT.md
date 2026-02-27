# Debt Report — Sprint Wave 15 Code Review

**Generated:** 2026-02-26  
**Branch:** `feat/refactor-sprint-wave-15`

---

## Resolved This Wave

| # | Item | Commit | Resolution |
|---|------|--------|------------|
| 1 | `shared/` → `app/` FSD violations (ROLES, POSITION_STEP) | `2d3b607` | Extracted to `src/shared/constants/index.ts` |
| 2 | `Record<string, unknown>` in form data pipeline | `f6e34c6` | Added `CreateProjectFormData` & `TaskFormData` interfaces |
| 3 | `planterClient.ts` raw date math duplicating `date-engine` | `f73e580` | Replaced with `calculateMinMaxDates()` call |

---

## Open Debt — Tracked in GitHub Issues

### Critical / High

_None remaining after this wave._

### Medium

| GitHub Issue | Title | Category |
|-------------|-------|----------|
| [#129](https://github.com/JoelA510/PlanterPlan-Alpha/issues/129) | FSD: Cross-feature slice coupling | Architecture |
| [#130](https://github.com/JoelA510/PlanterPlan-Alpha/issues/130) | 8 files import `date-fns` directly, bypassing `date-engine` | Date Safety |
| [#131](https://github.com/JoelA510/PlanterPlan-Alpha/issues/131) | `AuthContext.tsx`: 6 unsafe `as unknown as` casts | Type Safety |

### Low

| GitHub Issue | Title | Category |
|-------------|-------|----------|
| [#132](https://github.com/JoelA510/PlanterPlan-Alpha/issues/132) | Convert remaining 57 `.js`/`.jsx` files to TypeScript | Modernity |

### Pre-existing (from earlier waves)

| GitHub Issue | Title | Status |
|-------------|-------|--------|
| [#91](https://github.com/JoelA510/PlanterPlan-Alpha/issues/91) | Consolidate redundant global constants | Partially resolved (`2d3b607`) |
| [#93](https://github.com/JoelA510/PlanterPlan-Alpha/issues/93) | Unify setup instructions | Open |
| [#95](https://github.com/JoelA510/PlanterPlan-Alpha/issues/95) | Standardize routing parameters | Open |
| [#96](https://github.com/JoelA510/PlanterPlan-Alpha/issues/96) | Standardize core hook import paths | Open |
