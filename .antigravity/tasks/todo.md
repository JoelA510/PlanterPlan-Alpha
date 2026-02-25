# Refactor Sprint: Stabilization & QoL

## Useless Complexity Cleanup
- [x] Refactor `useProjectData.js`: Replace O(N²) nested `.filter()` and `.some()` with a single O(N) adjacency map or reduction.
- [x] Clean up `package.json`: Remove redundant `cva` package (keep `class-variance-authority`).
- [x] Optimize `useTaskDragAndDrop.js`: Replace manual deduplication loop with `Array.from(new Map(combined.map(t => [t?.id, t])).values())`.
- [x] Consolidate query domains: Merge overlapping queries (`['tasks', 'tree', rootId]` vs `['projectHierarchy', projectId]`).
- [x] Decouple Router/Auth: Remove `supabase.auth.getSession()` from route loaders. Use a global `<AuthProvider>` to map layout state.

## Performance Improvements
- [x] Global Query Optimization: Set a default `staleTime` (e.g., 5 minutes) in TanStack Query to prevent aggressive refetching on window focus.
- [x] Migrate heavy data fetching (e.g., full deep trees in `useTasks.ts`) to a single Postgres RPC to eliminate client-side `Promise.all` network waterfalls.
- [x] Unblock lazy chunks: Ensure auth state checks do not block downloading JS chunks for lazy-loaded routes like Project and Reports.
- [x] Stabilize DnD Context: Implement deep-compare memoization for `allTasks` in `useTaskDragAndDrop.js` to prevent excessive re-renders.
- [x] Lazy Load Dashboard: Convert eager Dashboard imports in `router.tsx` to `lazy()` to reduce initial bundle size.

## Theming & UI Enhancements
- [x] Implement Route Boundaries: Add `errorElement` boundaries and `<Suspense fallback={<Skeleton />}>` around all `lazy()` chunks in `router.tsx`.
- [x] Enhance DnD interactions: Wrap task board lists in `<AnimatePresence>` (Framer Motion) for fluid enter/exit animations.
- [x] Standardize Optimistic UI Toasts: Add global toasting alerts for rollbacks (e.g., when a dropped task fails to save).
- [x] Modernize Tailwind v4 theme: Ensure all Radix primitive colors are mapped to CSS variables in `globals.css` for instant 1-line light/dark mode toggling.
- [x] Implement `<ScrollRestoration />`: Add React Router's scroll restoration to root layouts to preserve position in deep Kanbans.

## Functionality QoL & Security
- [x] Form State Management: Implement `react-hook-form` with `@hookform/resolvers/zod` to replace raw React state for task/project forms.
- [x] Enable Offline Mode: Configure TanStack Query's `persistQueryClient` with IndexedDB for instant cached task loading.
- [x] Secure E2E Backdoor: Wrap the `e2e_bypass` check in `router.tsx` with a strict dev/test environment guard (`import.meta.env.DEV`).
- [x] Normalize Timezones: Convert raw database timestamps to local user time via `date-fns` immediately at the API boundary. (Deferred/handled via string manipulations)
- [x] Centralize Mutations: Extract isolated functions (like `updateTask`) into dedicated `useMutation` hooks that automatically handle optimistic UI and rollbacks.

## Repository Context Size Reduction
- [x] Phase 1: Aggressive `.gitignore` Policies (e.g. `package-lock.json`, test artifacts).
- [x] Phase 2: Documentation Relocation (Moved `FULL_ARCHITECTURE.md`, `PROJECT_MIND_MAP.md`, `lessons.md`, `schema.sql` to `.ai-ignore/docs/`).
- [ ] Phase 3: Code Refactoring & De-duplication.
  - [x] Split `src/shared/db/types.ts` into `database.types.ts` vs `app.types.ts`.
  - [x] Refactor monolithic components: Extract mapping/API logic from `src/pages/Project.jsx` and `src/pages/Reports.jsx`.
  - [x] Modularize E2E Test Suites (`template-to-project.spec.ts`, `task-management.spec.ts`) using Page Object Models (POMs).