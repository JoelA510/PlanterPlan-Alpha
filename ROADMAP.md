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

I inspected the repository’s `ROADMAP.md` and found that phases 0‑5 cover hygiene, critical fixes, partial features, refactor & consolidation, TypeScript/tests, and developer‑experience/performance work.  There are also sections for branch plans and acceptance checks.  To make code‑review more efficient, these larger items can be broken down into granular sub‑steps using a consistent numbering scheme.  Below is an expanded breakdown of Phase 3 onward (through Phase 10) with each step reduced to its smallest reasonable change.

---

## Phase 3 — Refactor & Consolidate

| Sub‑section                       | Task                                           | Specific steps                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3.1 Permission service**        | Centralize role/permission checks              | 3.1.a Audit all existing permission checks in the codebase; document where each occurs. 3.1.b Define a `permissionService` API to encapsulate these checks. 3.1.c Implement the `permissionService` with functions per role/permission. 3.1.d Refactor existing modules to use the service. 3.1.e Write unit tests verifying that each role correctly grants/denies access.                                                                                       |
| **3.2 Task‑update consolidation** | Unify task‑position updates                    | 3.2.a Catalogue all functions that modify task positions. 3.2.b Design a single `updateTaskPositions(updates[])` signature that can replace the disparate implementations. 3.2.c Implement the unified function and ensure it works for reordering, insertion and deletion. 3.2.d Replace old update calls with the new unified function. 3.2.e Add tests for edge cases (empty updates, concurrent reorder).                                                     |
| **3.3 Date‑logic centralization** | Centralize date logic into a single service    | 3.3.a Identify all date‑calculation utilities (e.g., `DateCacheEngine`, `dateUtils`). 3.3.b Design an API (`dateService`) that wraps these utilities. 3.3.c Implement `dateService` functions (e.g., parse, format, compare). 3.3.d Refactor existing components to consume `dateService` instead of scattered helpers. 3.3.e Write unit tests for date edge‑cases (time zones, DST).                                                                             |
| **3.4 Context split**             | Split `TaskContext` into more focused contexts | 3.4.a Document the responsibilities currently handled by `TaskContext`. 3.4.b Create `TasksContext` to provide task data and actions. 3.4.c Create `MemberProjectsContext` to manage project membership and metadata. 3.4.d Create `DragDropContext` to encapsulate drag‑and‑drop state. 3.4.e Refactor provider hierarchy and update consuming components to use the new contexts. 3.4.f Implement tests ensuring each context works independently and together. |

## Phase 4 — TypeScript & Tests

| Sub‑section                    | Task                                | Specific steps                                                                                                                                                                                                                                                       |
| ------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **4.1 TypeScript bootstrap**   | Introduce types for core models     | 4.1.a List properties for `Task`, `Project`, `Org` and `UserProfile`. 4.1.b Create TypeScript interfaces/types for these entities. 4.1.c Migrate JavaScript modules to TypeScript and apply the new types. 4.1.d Enable `strict` mode and fix resulting type errors. |
| **4.2 Unit tests**             | Add isolated tests                  | 4.2.a Write tests covering date calculations (e.g., relative deadlines, overdue detection). 4.2.b Test sparse positioning algorithms to ensure correct ordering. 4.2.c Test permission checks using the new `permissionService`.                                     |
| **4.3 Integration tests**      | Verify cross‑component interactions | 4.3.a Test converting a template into a project (import tasks, assign defaults). 4.3.b Test drag‑and‑drop reorder across lists and contexts. 4.3.c Test adding and removing tasks from the master library.                                                           |
| **4.4 End‑to‑end (E2E) tests** | Simulate user flows                 | 4.4.a Write an E2E flow for signing in/out via Supabase. 4.4.b Create a project, add tasks and reorder them. 4.4.c Complete tasks and generate a report; assert that the printed report matches expected output.                                                     |

## Phase 5 — Developer Experience, Performance, Deploy

| Sub‑section                      | Task                                           | Specific steps                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **5.1 Feature flags**            | Gate new search and notifications behind flags | 5.1.a Select a feature‑flag library or create a simple in‑house flag system. 5.1.b Implement flags for the new search engine. 5.1.c Implement flags for notifications and default them off. 5.1.d Add UI controls (if needed) to toggle flags in staging.                                                                                                                                     |
| **5.2 Staging & PR previews**    | Configure separate environments                | 5.2.a Provision a Supabase “staging” instance separate from production. 5.2.b Set up Vercel Preview deployments for every pull request. 5.2.c Automate environment‑variable injection so each preview uses the staging keys. 5.2.d Document how contributors can test features on staging.                                                                                                    |
| **5.3 Performance enhancements** | Optimize heavy views                           | 5.3.a Identify components with large prop/state trees or expensive computations. 5.3.b Memoize heavy components using `React.memo` or hooks like `useMemo`. 5.3.c Verify that dependencies (e.g., `tasks.length`) in hooks only change when necessary. 5.3.d Evaluate list virtualization; if beneficial, integrate a virtualization library (e.g., `react-window`) and measure improvements. |

## Phase 6 — Cleanup & Critical Fixes

| Sub‑section                            | Task                                   | Specific steps                                                                                                                                                                                                                 |
| -------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **6.1 Repository cleanup**             | `chore/cleanup` branch                 | 6.1.a Identify and remove dead code, unused components and commented‑out sections. 6.1.b Delete obsolete configuration files. 6.1.c Run Prettier and ESLint to standardize formatting.                                         |
| **6.2 Auth & CORS bug**                | `fix/auth-cors-email` branch           | 6.2.a Add a unique index on `lower(email)` and a trigger to lowercase emails (per Phase 1 step 1). 6.2.b Update Supabase CORS settings to allow app origins. 6.2.c Test sign‑up flows (existing user, new user) to verify fix. |
| **6.3 Search plumbing fixes**          | `fix/search-plumbing` branch           | 6.3.a Wire `SearchContext` to task/resource queries and implement debounced input. 6.3.b Add status and assignee filters to search. 6.3.c Write integration tests for search behaviour.                                        |
| **6.4 Master library view**            | `fix/master-library-view` branch       | 6.4.a Use `master_library_view` explicitly to differentiate org‑null vs. org‑scoped tasks. 6.4.b Implement pagination for large libraries. 6.4.c Test the view for both org types.                                             |
| **6.5 Priority/Archived filter fixes** | `fix/priority-archived-filters` branch | 6.5.a Fix filtering logic to handle orphan/empty milestones correctly. 6.5.b Ensure archived items are hidden in project dropdowns. 6.5.c Add unit tests covering these cases.                                                 |

## Phase 7 — Feature Development

| Sub‑section                       | Task                            | Specific steps                                                                                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **7.1 Automated monthly reports** | `feat/monthly-reports` branch   | 7.1.a Create a Supabase Edge Function to compile monthly data per organization. 7.1.b Configure a cron schedule for the function. 7.1.c Generate an HTML summary and design a basic template. 7.1.d Add per‑org recipient configuration and email sending. 7.1.e Write unit tests for report generation.           |
| **7.2 Notifications system**      | `feat/notifications` branch     | 7.2.a Design a notification schema (e.g., table columns, status flags). 7.2.b Implement weekly summary notifications. 7.2.c Implement overdue reminders. 7.2.d Implement comment‑ping notifications. 7.2.e Add a `notification_prefs` table/field for user settings. 7.2.f Write tests for each notification type. |
| **7.3 Smart library addition**    | `feat/smart-library-add` branch | 7.3.a Query tasks already included in a project and hide them from the library. 7.3.b Implement “related” suggestions based on task tags or categories. 7.3.c Enable multi‑select to add multiple tasks at once. 7.3.d Add unit/integration tests for the library picker.                                          |
| **7.4 Coaching tasks**            | `feat/coaching-tasks` branch    | 7.4.a Define the `'coaching'` task type and its schema updates. 7.4.b Write a function to auto‑assign coaching tasks to the appropriate coach. 7.4.c Add tests ensuring tasks are correctly assigned and visible.                                                                                                  |

## Phase 8 — Refactor Extensions

| Sub‑section                       | Task                                  | Specific steps                                                                                                                                                                                                                                        |
| --------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **8.1 Permission & date service** | `refactor/permissions-date-service`   | 8.1.a Consolidate the work from Phase 3 into a dedicated branch. 8.1.b Refactor any remaining scattered permission or date logic. 8.1.c Update documentation describing how to use the new services.                                                  |
| **8.2 Task‑update consolidation** | `refactor/task-updates-consolidation` | 8.2.a Move the unified `updateTaskPositions` function into its own module. 8.2.b Remove deprecated update helpers. 8.2.c Add migration notes for downstream consumers.                                                                                |
| **8.3 Context splitting**         | `refactor/context-split`              | 8.3.a Extract `TasksContext`, `MemberProjectsContext` and `DragDropContext` into separate files. 8.3.b Ensure each context has a clear public API and minimal coupling. 8.3.c Update provider composition and adjust imports throughout the codebase. |

## Phase 9 — TypeScript & Test Infrastructure

| Sub‑section                  | Task                         | Specific steps                                                                                                                                                                                                        |
| ---------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **9.1 TypeScript bootstrap** | `chore/typescript-bootstrap` | 9.1.a Set up the TypeScript compiler configuration (`tsconfig.json`). 9.1.b Gradually convert JavaScript files to TypeScript. 9.1.c Provide lint rules for type safety.                                               |
| **9.2 Test & CI setup**      | `chore/tests-ci-setup`       | 9.2.a Configure the test runner (e.g., Jest or Vitest) and set up coverage reporting. 9.2.b Integrate tests into the CI pipeline (GitHub Actions). 9.2.c Add required scripts (`npm run test`, `npm run test:watch`). |

## Phase 10 — Acceptance & Quality

| Sub‑section                       | Task                       | Specific steps                                                                                                                                                                                                                                                                                                      |
| --------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **10.1 Acceptance checks per PR** | Maintain quality standards | 10.1.a Include before/after notes in every PR. 10.1.b Provide a clear reproduction scenario for bug fixes. 10.1.c Ensure unit and integration tests are updated/added. 10.1.d Verify no new `console.log` statements remain. 10.1.e Run a basic Lighthouse audit to confirm tasks‑page performance is not degraded. |
| **10.2 General PR hygiene**       | Ongoing discipline         | 10.2.a Use descriptive branch names and commit messages. 10.2.b Request timely code reviews. 10.2.c Keep pull requests small and focused on a single sub‑task.                                                                                                                                                      |

---
