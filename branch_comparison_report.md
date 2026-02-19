# PlanterPlan-Alpha: Branch Comparison Report
## `main` vs `gold-master` — Architectural Analysis

**Date:** February 18, 2026
**Author:** Joel A.
**Repository:** JoelA510/PlanterPlan-Alpha

---

## Executive Summary

The `gold-master` branch represents a targeted refactoring of the `main` branch, aimed at improving long-term maintainability, type safety, and build reliability. It trades breadth of test coverage (removing 21 unit/integration test files) for architectural clarity (Feature-Sliced Design, dedicated routing, TypeScript pipeline) and a leaner codebase (–5,229 net lines across 329 files).

Both branches share identical feature modules, Supabase backend integration, and the same UI component library (Shadcn/Radix). The differences are structural, not functional.

---

## At a Glance

| Dimension | `main` | `gold-master` |
|---|---|---|
| **React Version** | 19.2.4 | 18.3.1 |
| **Source Files** | 233 | 223 |
| **App Entry Point** | `App.jsx` (167 LOC) | `App.tsx` (28 LOC) + `router.tsx` (86 LOC) |
| **Routing** | Inline `<Routes>` in App | `createBrowserRouter` with loaders |
| **Build Config** | `vite.config.js` (58 LOC, 8 aliases) | `vite.config.ts` (14 LOC, 1 alias) |
| **TypeScript** | Partial (no `tsconfig.json`) | Full (`tsconfig.json`, `.app`, `.node`) |
| **Build Command** | `vite build` | `tsc -b && vite build` |
| **Unit/Integration Tests** | 21 files under `src/tests/` | 0 (removed) |
| **E2E Tests** | 17 spec files | 18 spec files (+`v2-golden.spec.ts`) |
| **Test Runner (Unit)** | Vitest (no config file) | Vitest (`vitest.config.ts`) |
| **Layout** | Per-page inline layout | Shared `Layout.tsx` with sidebar |
| **Path Aliases** | 8 (`@app`, `@features`, `@pages`, `@shared`, `@layouts`, `@entities`, `@widgets`, `@`) | 1 (`@` → `./src`) |
| **Dark Mode** | Present | Removed |
| **Lazy Loading** | 2 routes (`Reports`, `Settings`) | 5 routes (`Project`, `Reports`, `Settings`, `Team`, `Tasks`) |

---

## Strengths

### `main` Branch

| Strength | Detail |
|---|---|
| **Broader test coverage** | 21 unit/integration test files covering auth security, XSS, drag-drop, task hierarchy, RLS, and crash scenarios. These are absent from `gold-master`. |
| **React 19 features** | Positioned to leverage upcoming React 19 features (Server Components, `useActionState`, `use()`) as the ecosystem matures. |
| **Feature completeness** | Dark mode support, Toast notifications, and `AuthSeeder` component for test data seeding are all intact. |
| **Granular path aliases** | Eight distinct aliases (`@app`, `@features`, `@pages`, etc.) allow very explicit imports, making it clear which architectural layer a module belongs to. |
| **Proven stability** | This is the production branch—it has been deployed and used. `gold-master` has not been production-tested. |

### `gold-master` Branch

| Strength | Detail |
|---|---|
| **Smaller, focused codebase** | –5,229 LOC. The monolithic 167-line `App.jsx` is replaced by a 28-line `App.tsx` + 86-line `router.tsx`, dramatically improving readability. |
| **Type safety** | Full TypeScript pipeline with `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`. Build failures are caught at compile time via `tsc -b`. |
| **Modern routing** | `createBrowserRouter` with route-level loaders and lazy imports. This is the React Router recommended pattern and enables per-route data loading, code splitting, and E2E-testable loaders. |
| **Aggressive lazy loading** | 5 routes are lazily loaded (vs 2 in `main`), reducing initial bundle size and improving time-to-interactive. |
| **Clean dependency graph** | Single `@` alias forces all imports through `src/`, preventing circular or ambiguous module resolution. |
| **Dedicated layout layer** | `Layout.tsx` in `src/shared/layout/` centralizes sidebar, navigation, and auth guards into a single reusable component. |
| **E2E-first testing** | New `v2-golden.spec.ts` validates the critical user path (login → dashboard → project → task) in headless mode. This is higher-value than many of the removed unit tests, which tested implementation details. |
| **React 18 stability** | React 18 is battle-tested. No risk of hitting undocumented React 19 edge cases in peer dependencies (Radix UI, Framer Motion, React Router). |

---

## Weaknesses

### `main` Branch

| Weakness | Detail |
|---|---|
| **Monolithic entry point** | `App.jsx` is 167 lines containing routing, auth guards, lazy loading, error boundaries, and provider wiring. This is fragile and hard to extend. |
| **No TypeScript build step** | No `tsconfig.json` means type errors are only caught at runtime or by IDE tooling—not during CI/CD builds. |
| **React 19 risk** | React 19 is still maturing. Peer dependencies (Radix UI, Framer Motion, React Router v7) may have subtle incompatibilities. No `useActionState` usage was found, meaning the upgrade provides no concrete benefit yet. |
| **Alias sprawl** | 8 path aliases create configuration complexity and make `vite.config.js` harder to maintain. |
| **Test quality concern** | While 21 test files exist, many test implementation details rather than user-facing behavior (e.g., `useTaskBoard.rollback.test.jsx`, `positionService.test.js`). These are brittle and break during refactors without indicating real regressions. |

### `gold-master` Branch

| Weakness | Detail |
|---|---|
| **Eliminated unit tests** | All 21 unit/integration test files were removed. This is the single largest risk. Critical coverage areas lost include: XSS sanitization, RLS policy enforcement, auth context security, drag-drop rollback logic, and date inheritance. |
| **Auth logout flakiness** | The `auth.spec.ts` E2E test's logout verification consistently fails—`supabase.auth.signOut()` does not trigger a reliable redirect in the headless browser environment. |
| **No dark mode** | Dark mode was removed for simplicity, but this is a regression in user experience. |
| **Unproven in production** | Has not been deployed or used by real users. |
| **Dependency additions** | Adds `@supabase-cache-helpers/postgrest-react-query` and additional Radix UI packages (accordion, collapsible, context-menu, hover-card, menubar, navigation-menu, scroll-area, slider, tabs, toast, toggle, toggle-group, tooltip)—most of which are not yet used in any component. |

---

## Risk Assessment

| Risk | Severity | Branch | Mitigation |
|---|---|---|---|
| Type errors in production | **High** | `main` | Add TypeScript build step (adopt `gold-master` approach) |
| Missing security test coverage | **High** | `gold-master` | Port XSS, RLS, and auth security tests from `main` |
| React 19 peer dependency issues | **Medium** | `main` | Monitor Radix/Framer compatibility; downgrade if needed |
| E2E logout flakiness | **Medium** | `gold-master` | Fix `auth.spec.ts` or mock the Supabase signOut event |
| Unused dependencies bloat | **Low** | `gold-master` | Audit and remove unused Radix packages |
| Dark mode regression | **Low** | `gold-master` | Re-implement when UI stabilizes |

---

## Recommendation

**Adopt `gold-master` as the forward path**, with the following conditions before merging into `main`:

1. **Port critical unit tests** — Selectively restore XSS, RLS, and auth security tests from `main`. These test real security invariants, not implementation details.
2. **Fix E2E logout** — Resolve the `auth.spec.ts` flakiness by mocking the Supabase `SIGNED_OUT` event at the network level rather than relying on the real client.
3. **Audit unused dependencies** — Remove Radix UI packages that have no corresponding component usage.
4. **Document the React 18 decision** — The existing ADR (`docs/ADR/002-downgrade-react.md`) should be updated to reflect the final rationale.

The architectural improvements in `gold-master`—TypeScript safety, clean routing, smaller surface area—provide a stronger foundation for the next phase of development. The lost test coverage is recoverable; the architectural debt in `main` is not.
