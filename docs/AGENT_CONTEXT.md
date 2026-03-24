# Agent Context & Codebase Map

> **For AI Agents**: Read this first to understand the system architecture,
> patterns, and where to find things. **TECH STACK ALERT**: JavaScript and JSX
> are entirely deprecated. TypeScript (.ts) and TSX (.tsx) are strictly enforced
> across the codebase.

## 1. Directory Structure (Feature-Sliced Variation)

- **`src/features/`**: Domain-specific logic (Business Logic).
  - Structure: `components/`, `hooks/`, `services/`, `index.js` (public API).
  - Key Domains: `projects`, `tasks`, `people`, `auth`.
- **`src/pages/`**: Top-level Route Views (Page Composition).
  - _Note_: Pages should primarily compose features, not contain deep logic.
- **`src/shared/`**: Universal utilities and UI (No Business Logic).
  - `ui/`: ShadCN/Radix primitives (Buttons, Inputs, Dialogs).
  - `lib/`: Pure functions (`date-engine`, `formatters`).
  - `api/`: API adapters (`planterClient`).
- **`docs/`**: Source of Truth.
  - `docs/db/schema.sql`: Current Database Schema.
  - `docs/ENGINEERING_KNOWLEDGE.md`: Lessons learned & common pitfalls.

## 2. Key Patterns

### Data Fetching

- **Primary**: `useQuery` (React Query) via `planterClient`.
- **Adapter**: `src/shared/api/planterClient.ts` wraps Supabase SDK.
- **Rules**:
  - Do NOT use `supabase.from()` directly in UI components. Use `planterClient`
    or custom hooks.
  - Always handle `loading` and `error` states.

### State Management

- **Server State**: React Query (Single Source of Truth).
- **Local State**: `useState` / `useReducer` for form/UI state.
- **Global UI State**: Context (AuthContext, ToastContext).

### Styling

- **Engine**: TailwindCSS.
- **Components**: Radix UI primitives wrapped in `src/shared/ui`.
- **Icons**: `lucide-react`.
- **Rules**: Avoid custom CSS files. Use utility classes and
  `class-variance-authority`.

## 3. Golden Paths (Critical Files)

- **Auth**: `src/features/auth/components/LoginForm.tsx`
- **Project Board**: `src/pages/Project.tsx` ->
  `src/features/tasks/components/ProjectPipelineBoard.tsx`
- **Task Details**: `src/features/tasks/components/TaskDetailsView.tsx`
- **Date Logic**: `src/shared/lib/date-engine/index.ts` (Handle with care!)

## 4. Testing & Verification

- **Unit/Integration**: `npm test` (Vitest).
- **E2E Tests**: `npm run test:e2e` (Playwright BDD — feature files in `e2e/features/`).
- **Linting**: `npm run lint` (Zero-tolerance for errors).

## 5. Deployment / Build

- **Build**: `npm run build` (Vite).
- **Environment**: Local Supabase (`127.0.0.1:54321`) mimics Sync/Realtime.

## 6. Ignorable Files (Context Noise)

The following files are generated or tracked for AI context but are not critical
for a human code review. They can be safely ignored to save focus:

- **`PR_DESCRIPTION_DRAFT.md`**: Draft content for the PR description (Root).
- **`DEBT_REPORT.md`**: A comprehensive log of technical debt and linting
  issues.
- **`docs/operations/ENGINEERING_KNOWLEDGE.md`**: A cumulative knowledge base;
  check only if solving a complex architectural problem.
- **`browser_audit.json`**: Automated verification logs.
- **`docs/db/drafts/*`**: Work-in-progress SQL scripts.
- **`.antigravity/*`**: AI Agent configuration, rules, and workflows.
- **`archive/*`**: Old code and documentation.
- **`supabase/seeds/*`**: Large seed files (unless modifying data
  initialization).
