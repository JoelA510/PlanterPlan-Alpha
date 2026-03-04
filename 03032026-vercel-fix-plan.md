# Fix Vercel Build: ~180 TypeScript Errors on `refactor` Branch

## Context
The `refactor` branch is a full rewrite from JavaScript/CRA to TypeScript/Vite with React Query, Zod, Radix UI, and a new feature-sliced architecture. The Vercel build fails with ~180 TypeScript compilation errors. Most errors stem from a handful of root causes that cascade across many files.

## Root Cause Analysis

The ~180 errors collapse into **8 root causes**:

### RC1: `null` vs `undefined` type mismatches (~80 errors)
Supabase auto-generated types use `field: type | null`. Custom app types use `field?: type` (which means `type | undefined`). TypeScript's strict mode doesn't allow assigning `null` to `undefined` or vice versa.

**Fix:** Update custom types in `src/shared/types/tasks.ts`, `src/shared/db/app.types.ts`, and feature-level types to consistently use `| null` to match Supabase row types. Add a utility type `type Nullable<T> = T | null` where helpful.

### RC2: Custom types missing DB row fields (~30 errors)
Types like `HierarchyTask`, `SelectableProject`, `SidebarTask`, `Person`, `TeamMember`, etc. are defined with fewer fields than the Supabase row type, causing "missing properties" errors when assigned.

**Fix:** Ensure custom types `extend` the Supabase row types rather than redefining them incompletely. E.g., `interface HierarchyTask extends TaskRow { children?: HierarchyTask[] }`.

### RC3: Missing modules (~10 errors)
- `src/shared/db/client.ts` imports from `./types` — should be `./database.types`
- `src/features/library/hooks/useTreeState.ts` imports from `@/shared/lib/treeHelpers` — file doesn't exist
- `src/features/tasks/components/TaskList.tsx` imports from `@layouts/DashboardLayout` — wrong path alias
- `src/shared/test/factories/index.ts` imports `@faker-js/faker` — not in package.json

### RC4: API/prop signature mismatches (~25 errors)
Components and hooks are called with wrong argument types:
- `onToggleExpand` expects `(id: string)` but receives `(task, expanded)`
- `TaskFormState` is not exported from its module
- `useCallback` not imported in TaskList.tsx
- `CreateProjectModal` receives `onCreate`/`mode` props that don't exist on its type
- Various return type mismatches between hooks and their consumers

### RC5: Library API changes (~10 errors)
- **Zod:** `required_error` → use `{ error: "message" }` or `{ message: "..." }`
- **recharts:** `Payload` export moved — import from different path
- **react-day-picker:** `IconLeft`/`IconRight` → `components` API changed
- **lucide-react:** `title` prop removed from icon components
- **@tanstack/react-query:** `initialPageParam` is now required for `useInfiniteQuery`
- **Supabase realtime:** `postgres_changes` channel API changed

### RC6: Supabase client `.abortSignal()` method (~5 errors)
`PostgrestBuilder` may not have `.abortSignal()` in the version used. The `@ts-expect-error` directives that were suppressing this are now "unused" (meaning the API changed).

### RC7: Unused imports/variables (~5 errors)
- `React` imported but unused in PeopleList.tsx
- `status` declared but unused in Project.tsx
- `TaskRow` imported but unused in TaskItem.tsx
- `compareDateDesc` referenced but not defined in PeopleList.tsx

### RC8: Function/component prop mismatches (~15 errors)
- `ErrorFallback` passes `children` to `StatusCard` which doesn't accept it
- `Progress` component doesn't have `indicatorClassName` prop
- `OnboardingWizard` tests missing required `onCreateProject` prop
- Various `null` where `undefined` expected in component props

## Implementation Plan

### Phase 1: Fix missing modules and imports (RC3, RC7)
Files: `src/shared/db/client.ts`, `src/features/library/hooks/useTreeState.ts`, `src/features/tasks/components/TaskList.tsx`, `src/shared/test/factories/index.ts`, `src/features/people/components/PeopleList.tsx`, `src/pages/Project.tsx`, `src/features/tasks/components/TaskItem.tsx`

### Phase 2: Fix core type definitions (RC1, RC2)
Files: `src/shared/db/app.types.ts`, `src/shared/types/tasks.ts`, and any feature-level type files. Ensure all custom types extend Supabase row types and use `| null` consistently.

### Phase 3: Fix library API issues (RC5, RC6)
Files: `src/entities/project/model.ts` (Zod), `src/shared/ui/calendar.tsx` (react-day-picker), `src/shared/ui/chart.tsx` (recharts), `src/shared/api/planterClient.ts` (Supabase abortSignal), `src/features/tasks/hooks/useTaskQuery.ts` (React Query), `src/features/projects/hooks/useProjectRealtime.ts` (Supabase realtime)

### Phase 4: Fix component/hook signature mismatches (RC4, RC8)
Files: All component and hook files with prop/return type mismatches. This includes updating interfaces, adding missing props, and aligning callback signatures.

### Phase 5: Fix remaining type errors
Address any remaining errors after phases 1-4, primarily in page-level components and test files.

## Verification
1. `npx tsc -b --noEmit` — zero errors
2. `npm run build` — successful Vite build
3. `npm test` — existing tests pass
