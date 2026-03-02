# Refactor Sprint: Wave 16 - Architecture Polish & Critical Fixes

## Phase 1: Critical Runtime & Routing Fixes

- [x] **1. Fix Missing Imports (Runtime Crashes)**
  - *Effect*: Resolve ReferenceErrors crashing the project and report views due to missing hook/helper imports during TSX conversion.
  - *Agent Prompt*: Execute the following import fixes:
    1. Open `src/pages/Project.tsx` and add the missing imports: `useParams` (from `react-router-dom`), `useAuth` (from `@/app/contexts/AuthContext`), and `useMemo` (from `react`).
    2. Open `src/features/projects/components/ProjectHeader.tsx` and add the missing import for `createPageUrl` from `@/shared/lib/utils`.
    3. Run `npx tsc --noEmit` and `npm run lint` to verify.

- [x] **2. Restore Router Auth Guard**
  - *Effect*: Prevent unauthenticated users from briefly mounting protected child routes and accessing cached React Query data before the layout `useEffect` redirect fires.
  - *Agent Prompt*: Open `src/app/router.tsx`. The protected route `loader` currently returns `null`. You must restore the authentication check in this loader. Maintain the `VITE_E2E_MODE === 'true'` bypass for testing, but block normal unauthenticated users and redirect them using React Router's `redirect('/login')`.

## Phase 2: Schema Integrity & Type Safety

- [x] **3. Fix PostgREST Aliasing Reversal**
  - *Effect*: Fix broken API calls caused by removing DB aliases but querying the alias name instead of the real Supabase column name.
  - *Agent Prompt*: 
    1. Verify the `.select()` strings in `src/shared/api/planterClient.js`. They MUST query the real DB columns (e.g., `name`, `owner_id`, `launch_date`). Do NOT query `title`, `creator`, or `due_date` if they are not the actual Supabase columns.
    2. Update the UI consumers (e.g., `src/features/dashboard/components/ProjectCard.tsx`, `CreateProjectModal.tsx`) to consume the true DB column names (`project.name`, `project.owner_id`, etc.).

- [x] **4. Audit Fresh TSX Conversions for `any` Types**
  - *Effect*: Remove lazy TS typing introduced during the bulk `.jsx` to `.tsx` conversion in Wave 15.
  - *Agent Prompt*: Review `src/features/tasks/components/TaskDetailsPanel.tsx`, `src/features/dashboard/components/ProjectCard.tsx`, and `src/layouts/DashboardLayout.tsx`. Remove any implicit or explicit `any` types on their props and replace them with proper interfaces from `src/shared/db/app.types.ts` or `database.types.ts`.

## Phase 3: TanStack Query Modernization

- [x] **5. Refactor Library Search Hook**
  - *Effect*: Replace manual `useState`/`useEffect` data fetching with a robust TanStack Query implementation.
  - *Agent Prompt*: Refactor `src/features/library/hooks/useMasterLibrarySearch.ts`. Strip out the manual state/ref logic. Return a `@tanstack/react-query` `useQuery`. Use the `useDebounce` hook for the query string. Ensure it gracefully handles empty strings by returning `{ results: [], hasMore: false }` without hitting the API.

- [x] **6. Refactor Library Tasks Hook**
  - *Effect*: Replace manual pagination state with TanStack's built-in infinite scrolling capabilities.
  - *Agent Prompt*: Refactor `src/features/library/hooks/useMasterLibraryTasks.ts`. Return a `@tanstack/react-query` `useInfiniteQuery` to handle paginated data fetch from `planter.entities.TaskWithResources.listTemplates`. Use `pageParam` to calculate the `from` offset. Ensure `getNextPageParam` correctly determines if there are more pages based on the `limit`.

## Phase 4: Mass Typing & Lint Cleanup

- [x] **7. Resolve Core Hook & API Types**
  - *Effect*: Eliminate `any` in critical data flows to prevent runtime regressions.
  - *Target*: `useTaskMutations.ts`, `useTaskBoardUI.ts`, `planterClient.ts`.

- [x] **8. Resolve Component Debt & Lint Warnings**
  - *Effect*: Reach 0 warnings/errors state for the production build.
  - *Target*: `TaskList.tsx`, `Dashboard.tsx`, `Project.tsx` residuals, and unused imports.

## Phase 5: Test Hardening & FSD Optimization

- [ ] **1. Address Known Regressions**
  - *Effect*: Resolve component test failures identified during Wave 16.
  - *Action*: Run `vitest` scan, identify failures, and use TDD_ARCHITECT mode to fix.
- [ ] **2. Anti-Flake & Coverage Expansion**
  - *Effect*: Ensure test stability and fill coverage gaps without writing implementation first.
  - *Protocol*: Strict Red-Green-Refactor. No new logic without a failing test.
- [ ] **3. Deep FSD & Modernity Audit**
  - *Effect*: Enforce strict architectural boundaries and modernity standards.
  - *Checks*: 
    - Zero `features` -> `shared` leaks.
    - Zero `supabase.from()` in JSX.
    - Zero raw date math outside `date-engine`.