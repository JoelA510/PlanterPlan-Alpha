# PlanterPlan-Alpha Roadmap

## Phase 0 — Hygiene
- Add `.env.example` and verify Supabase keys/URLs per env.
- ESLint + `eslint-plugin-react-hooks` + Prettier; CI lint step.
- Replace ad-hoc logs with a tiny logger (dev vs prod).
- Remove unused/commented code.

## Phase 1 — Critical fixes
1) Auth/Sign-up
   - Supabase: unique index on lower(email); pre-insert trigger to lowercase email.
   - Fix CORS: allow app origin(s) in Supabase Auth.
2) Search
   - Wire `SearchContext` → task/resource queries; debounced text + status/assignee filters.
3) Master Library display
   - Use `master_library_view` explicitly; org=null vs org-scoped; pagination.
4) Priority/Archived filters
   - Fix orphan/empty milestone filtering; hide archived in project dropdown.

## Phase 2 — Complete partial features
- Automated monthly reports (Edge Function + cron; HTML summary; per-org recipients).
- Notifications (weekly summary, overdue, comment pings; `notification_prefs`).
- Smart library add (hide already-included; “related”; multi-select).
- Coaching tasks (auto-assign when `task.type='coaching'`).

## Phase 3 — Refactor & consolidate
- `permissionService` centralizes role/permission checks.
- Unify task updates → `updateTaskPositions(updates[])`.
- Centralize date logic into `dateService` (wrap `DateCacheEngine` + `dateUtils`).
- Split `TaskContext` into `TasksContext`, `MemberProjectsContext`, `DragDropContext`.

## Phase 4 — TypeScript & tests
- TS bootstrap: types for `Task`, `Project`, `Org`, `UserProfile`.
- Unit: date calc, sparse positioning, permission checks.
- Integration: template→project, drag/drop reorder, library add/remove.
- E2E: auth → create project → add tasks → complete → report print.

## Phase 5 — DX, perf, deploy
- Feature flags for new search + notifications.
- Supabase “staging” + Vercel Preview for each PR.
- Memoize heavy views; verify `tasks.length` deps; (optional) list virtualization.

## Branch plan
- `chore/cleanup`
- `fix/auth-cors-email`
- `fix/search-plumbing`
- `fix/master-library-view`
- `fix/priority-archived-filters`
- `feat/monthly-reports`
- `feat/notifications`
- `feat/smart-library-add`
- `feat/coaching-tasks`
- `refactor/permissions-date-service`
- `refactor/task-updates-consolidation`
- `refactor/context-split`
- `chore/typescript-bootstrap`
- `chore/tests-ci-setup`

## Acceptance checks (per PR)
- Before/after notes; clear repro if bugfix.
- Unit/integration tests added/updated.
- No new prod `console.log`.
- Tasks page perf unchanged or better (basic Lighthouse).
