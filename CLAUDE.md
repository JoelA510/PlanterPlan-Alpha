# CLAUDE.md — PlanterPlan

Church planting project management app built with React + TypeScript + Supabase.

## Quick Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite production build (tsc -b && vite build)
npm run lint         # ESLint (zero-tolerance)
npm test             # Vitest unit/integration tests
npm run test:e2e     # Playwright BDD end-to-end tests
```

**Always run `npm run build` after code changes to verify.** The build enforces `noUnusedLocals` and `noUnusedParameters` — unused variables are errors, not warnings.

## Architecture

### Feature-Sliced Design (FSD)

```
src/
├── app/           # App shell (App.tsx, providers, router)
├── features/      # Domain logic — each feature has components/, hooks/
│   ├── dashboard/
│   ├── library/
│   ├── navigation/
│   ├── people/
│   ├── projects/
│   ├── settings/
│   └── tasks/
├── layouts/       # DashboardLayout
├── pages/         # Route-level components (compose features, minimal logic)
└── shared/        # Cross-cutting concerns
    ├── api/       # planterClient.ts (Supabase wrapper), auth.ts
    ├── contexts/  # AuthContext (single merged auth + session + profile)
    ├── db/        # Supabase client, generated types, app types
    ├── lib/       # Pure utilities (date-engine, tree-helpers, retry)
    └── ui/        # Shadcn/Radix primitives
```

**Boundary rules (ESLint-enforced):**
- `shared/` cannot import from `features/` or `app/`
- `features/` cannot import from `app/`
- Features import from each other via direct paths (no barrel files)

### Data Flow

```
Component → React Query hook → planterClient → Supabase SDK
```

- **planterClient.ts** (`src/shared/api/planterClient.ts`): Central API adapter. All DB access goes through here — never call `supabase.from()` directly in components.
- **React Query**: Server state management. Mutations use `useTaskMutations` / `useProjectMutations` hooks with optimistic updates.
- **AuthContext** (`src/shared/contexts/AuthContext.tsx`): Single context handling session, user profile, role hydration, and auth actions.

### Key Domain Concepts

- **Tasks and Projects share one DB table** (`tasks`). A "project" is a root task (`parent_task_id = null`). Hierarchy is `root_id` + `parent_task_id`.
- **origin** field: `'template'` (library templates) vs `'instance'` (active projects).
- **date-engine** (`src/shared/lib/date-engine/`): Handles date calculations, cascading parent dates, relative scheduling. Modify with care.

## Tech Stack

- **React 19** + **TypeScript** (strict mode, ES2022 target)
- **Vite** (build + dev server)
- **Supabase** (Postgres, Auth, Realtime, Edge Functions)
- **TanStack React Query v5** (server state)
- **Tailwind CSS v4** + **Radix UI** + **Shadcn** components
- **dnd-kit** (drag and drop)
- **Lucide React** (icons)
- **Sonner** (toast notifications)

## Conventions

- **TypeScript only** — no `.js` or `.jsx` files. Ever.
- **No barrel files** — import directly from component/hook paths.
- **Path alias**: `@/` maps to `src/`. Use `@/features/...`, `@/shared/...`, etc.
- **Types**: Derived from Supabase generated types in `src/shared/db/database.types.ts`, re-exported as domain types in `src/shared/db/app.types.ts`.
- **No direct Supabase calls in components** — go through `planterClient` or mutation hooks.
- **Styling**: Tailwind utility classes only. No custom CSS files. Use `class-variance-authority` for variants.

## Routes

```
/login          → LoginForm
/dashboard      → Dashboard (default after login)
/reports        → Reports
/project/:id    → Project detail
/tasks          → TasksPage (My Tasks view)
/settings       → Settings
```

## Environment

```
VITE_SUPABASE_URL       # Supabase project URL
VITE_SUPABASE_ANON_KEY  # Supabase anon key
```

Local Supabase: API on `:54321`, DB on `:54322`, Studio on `:54323`.

## Critical Files

- `src/shared/api/planterClient.ts` — All CRUD + business logic (hierarchy, cloning, cascading dates)
- `src/shared/contexts/AuthContext.tsx` — Auth state, session, role hydration
- `src/shared/lib/date-engine/index.ts` — Date calculations (fragile, test thoroughly)
- `src/shared/db/app.types.ts` — Domain type definitions
- `src/features/tasks/components/TaskList.tsx` — Main project task view (project selection, tree, board UI)
- `src/features/tasks/hooks/useTaskMutations.ts` — Task CRUD with optimistic updates
- `src/features/tasks/hooks/useTaskQuery.ts` — Coordinates task + project queries
- `docs/db/schema.sql` — Database schema source of truth
