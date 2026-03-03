# PlanterPlan-Alpha remediation report

## Scope and evidence base

This report remediates the 105 unresolved issues captured in the attached review
artifact and uses that as the canonical "verified issues" list.

The issues cluster into a few systemic failure modes:

- Type safety is being bypassed via `any`, `unknown`, wide `Record<string, ...>`
  types, and pervasive `as` assertions so the compiler cannot defend contracts.
- Feature-Sliced Design (FSD) dependency direction is violated (features
  importing from `app/` or sibling features) and domain strings are duplicated
  as literals.
- Date handling is inconsistent: raw `new Date()` / `toISOString()` appear where
  a centralized date wrapper is intended.
- Forms are not consistently modeled as Zod schemas + inferred types; ad-hoc
  payloads + manual validators are still present.
- Performance problems exist in both UI rendering (work inside render) and
  client-side graph/tree building, plus missing cancellation and unbounded
  concurrency.
- Auth/session and error handling include production code contaminated by E2E
  logic, swallowed errors, and token/session management patterns that risk
  desync.

Current as of 2026-03-02 (America/Los_Angeles). External best-practice
references are cited inline, favoring primary docs.

## Type safety and API contracts

### Why its problematic

Using `any` disables type checking and will silently propagate through
expressions, erasing compiler guarantees. `unknown` is safer than `any`, but it
only helps if you force narrowing before use; otherwise it becomes "type
assertion fuel" and you end up with `as` casts everywhere. Type assertions
(`value as SomeType`) have no runtime effect and are explicitly "trust me"
directives to the compiler; large-scale reliance turns compile-time safety into
an illusion.

### Recommended patterns backed by authoritative guidance

A workable baseline that aligns with TypeScript guidance:

- Treat boundaries as `unknown` and validate/narrow immediately (type guards or
  schema validation) instead of casting. `unknown` requires narrowing; `any`
  does not.
- Use type assertions only when you already proved the type by control flow or
  validation; do not use assertions to "make errors go away".
- Institutionalize "no `any`" except temporary migration code; TypeScript
  explicitly recommends avoiding `any` when possible.

### Concrete refactor steps

- Replace `(x as any).field` with a correctly typed model or a narrowing
  function.
- Replace `Record<string, ...>` payloads with:
  - `zod` schema-derived types for form payloads, and/or
  - mapped types over known keys (`Partial<Record<keyof T, ...>>`) for internal
    filtering APIs.
- Remove `unknown` returns from the API client; return concrete types (or a
  `Result<T, E>`), and validate any dynamic JSON before returning.

Example: replace assertion-driven access with a narrow + fail-fast helper:

```ts
// shared/lib/guards.ts
export function invariant(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

// Example usage: ensure the payload has a string id
export function asStringId(id: unknown): string {
  invariant(
    typeof id === "string" && id.length > 0,
    "Expected non-empty string id",
  );
  return id;
}
```

Example: make `rawSupabaseFetch` generic and stop "unknown infection":

```ts
// shared/api/rawSupabaseFetch.ts
export async function rawSupabaseFetch<T>(
  url: string,
  init: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    // Prefer structured error parsing (see Auth/error section).
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T; // boundary cast; validate before returning from higher layer if needed
}
```

### Where to apply in this repo

The attached issue list calls out repeated type masking in components, hooks,
and the API client, including:

- `as any` for `parent_task_id` and project id access (Issue 1).
- Direct `any` in component prop interfaces (Issue 11).
- `unknown` generics and `unknown` returns in `planterClient` (Issues 14, 21,
  41).
- Casting React Query mutation context (`context as { ... }`) (Issue 17).
- `JSON.parse()` values used without validation (Issue 47).
- A large `as { Project: ... }` assertion that blinds the compiler to interface
  violations (Issue 27).

Issue-to-recipe mapping for this theme:

| Issue | Title                                                     | Where                                                                                                                                                          | Recipe                                  |
| ----: | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
|     1 | Type-Mask Eradication (`any` and `as unknown as`)         | src/features/projects/hooks/useProjectMutations.ts, src/features/tasks/components/TaskItem.tsx, src/features/tasks/components/board/BoardTaskCard.tsx, +1 more | TS-A3 typed API client boundary         |
|    11 | Direct `any` Typing in Component Interfaces               | src/features/tasks/components/board/BoardTaskCard.tsx                                                                                                          | TS-A3 typed API client boundary         |
|    12 | `as unknown as` Type-Masking in the Core API Client       | src/shared/api/planterClient.ts                                                                                                                                | TS-A4 env config validation             |
|    14 | Catch-All Generics (`unknown`) in Supabase Entity Clients | src/shared/api/planterClient.ts                                                                                                                                | TS-A3 typed API client boundary         |
|    15 | Type Casting (`as string`) to Bypass Library Interfaces   | src/features/library/components/MasterLibraryList.tsx                                                                                                          | TS-A1 strengthen domain types           |
|    17 | React Query Context Type-Masking (`as { ... }`)           | src/features/tasks/hooks/useTaskMutations.ts                                                                                                                   | TS-A2 replace assertions with narrowing |
|    18 | Fractured / Duplicated Type Extensions for Hierarchy      | src/features/tasks/components/TaskDetailsView.tsx, src/features/tasks/components/TaskItem.tsx, src/features/tasks/components/board/BoardTaskCard.tsx           | TS-A1 strengthen domain types           |
|    21 | Pervasive `unknown` Returns in the Core API Client        | src/shared/api/planterClient.ts                                                                                                                                | TS-A3 typed API client boundary         |
|    27 | Massive Type Assertion on the API Client Object           | src/shared/api/planterClient.ts                                                                                                                                | TS-A3 typed API client boundary         |
|    29 | React Ref Type-Masking                                    | src/features/tasks/components/TaskItem.tsx                                                                                                                     | TS-A2 replace assertions with narrowing |
|    30 | Optimistic UI Cache Forcing (`as TaskRow`)                | src/features/tasks/hooks/useTaskMutations.ts                                                                                                                   | TS-A1 strengthen domain types           |

## Architecture boundaries and domain constants

### Why its problematic

Feature-Sliced Design exists to control responsibility and prevent dependency
tangles. Its core "import rule on layers" is strict: a slice may only import
from slices on layers below. When `features/*` import from `app/*` (upward
dependency) or sibling features (`features/a` importing `features/b`), you
reintroduce cycles and make refactors (and runtime composition) brittle.

Magic strings (status/origin/role literals) are a second-order architecture bug:
they create implicit contracts that are not enforced by the compiler, producing
inconsistent behavior across screens (for example, mismatched completion
constants).

### Recommended patterns

- Enforce the FSD layer import rule with tooling (eslint boundary rules) and a
  stable public API per slice:
  - Each slice exports from `index.ts` only what other layers are allowed to
    consume.
  - Cross-feature composition happens in `pages/` or `widgets/`, not inside one
    feature importing another.
- Centralize domain constants in `shared/constants` and derive union types from
  them so the compiler enforces valid values:
  - `as const` constant objects
  - `type X = typeof CONST[keyof typeof CONST]`

Example: constants + derived types:

```ts
// shared/constants/task.ts
export const TASK_ORIGIN = {
  INSTANCE: "instance",
  TEMPLATE: "template",
} as const;

export type TaskOrigin = typeof TASK_ORIGIN[keyof typeof TASK_ORIGIN];

export const TASK_STATUS = {
  PLANNING: "planning",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];
```

### Concrete refactor steps

- Move `TASK_STATUS`, `PROJECT_STATUS`, `ROLES`, and color/status mapping tables
  into `src/shared/constants/*`.
- Replace all imports like `from "@/app/constants/index"` inside `features/*`
  with `from "@/shared/constants/*"`.
- Break cross-feature imports by:
  - hoisting the shared UI to `widgets/` (or `entities/` if it truly is an
    entity UI),
  - or passing components as render props/callbacks from pages/widgets.

Example: remove cross-feature `tasks -> projects` UI import:

```ts
// BEFORE (bad): features/tasks importing features/projects
// TaskDetailsPanel.tsx
import { NewProjectForm } from "@/features/projects";

// AFTER (good): make panel accept injected UI
type TaskDetailsPanelProps = {
  renderNewProject?: () => React.ReactNode;
};

export function TaskDetailsPanel({ renderNewProject }: TaskDetailsPanelProps) {
  return <div>{renderNewProject?.()}</div>;
}

// Then pages/widgets composes NewProjectForm into TaskDetailsPanel
```

### Where to apply in this repo

Multiple issues show upward and lateral violations and constant leaks,
including:

- Features importing constants from `app/constants` instead of
  `shared/constants` (Issues 3, 6).
- Features importing `useAuth` from `app/contexts/AuthContext` (Issue 23).
- Cross-feature imports: `tasks` importing `projects`, `library` importing
  `tasks`, `dashboard` importing `projects`, etc. (Issues 31, 32, 36, 46, 81).
- Magic strings for statuses/origin/roles and inconsistent domain constants
  (Issues 44, 50, 58, 61).
- SPA-breaking navigation and DOM-event hacks (Issues 60, 62).

Issue-to-recipe mapping for this theme:

| Issue | Title                                                                | Where                                                                                                                                                 | Recipe                                               |
| ----: | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
|     3 | FSD Boundaries & Constants Leaks                                     | src/features/dashboard/components/ProjectCard.tsx, src/features/projects/components/PhaseCard.tsx, src/features/projects/components/ProjectHeader.tsx | AR-B1 move constants to shared and enforce FSD       |
|     6 | Persistent FSD Boundary Leaks (App Layer Imports)                    | src/features/dashboard/components/ProjectPipelineBoard.tsx                                                                                            | AR-B1 move constants to shared and enforce FSD       |
|    19 | Type Casting for Object Keys (`as string`)                           | src/features/dashboard/components/ProjectCard.tsx, src/features/dashboard/components/ProjectPipelineBoard.tsx                                         | AR-B3 centralize domain constants/unions             |
|    23 | Upward FSD Dependency Leak (`app/` into `features/`)                 | src/features/tasks/components/TaskDetailsView.tsx                                                                                                     | AR-B1 move constants to shared and enforce FSD       |
|    31 | Cross-Feature FSD Violation (`tasks` depending on `projects`)        | src/features/tasks/components/TaskDetailsPanel.tsx                                                                                                    | AR-B2 remove cross-feature imports; lift composition |
|    32 | Cross-Feature FSD Violation (`library` depending on `tasks`)         | src/features/library/components/MasterLibraryList.tsx                                                                                                 | AR-B2 remove cross-feature imports; lift composition |
|    33 | Upward FSD Dependency Leak (`auth` depending on `app`)               | src/features/auth/components/LoginForm.tsx                                                                                                            | AR-B1 move constants to shared and enforce FSD       |
|    36 | Lateral FSD Boundary Violation (`dashboard` depending on `projects`) | src/features/dashboard/components/ProjectPipelineBoard.tsx                                                                                            | AR-B2 remove cross-feature imports; lift composition |
|    44 | Hardcoded "Magic Strings" instead of Domain Constants                | src/features/tasks/components/TaskDetailsView.tsx, src/shared/api/planterClient.ts                                                                    | AR-B3 centralize domain constants/unions             |
|    46 | Lateral FSD Violation (`projects` depending on `tasks`)              | src/features/projects/components/EditProjectModal.tsx                                                                                                 | AR-B2 remove cross-feature imports; lift composition |
|    50 | Hardcoded "Magic Strings" for Union Types                            | src/features/tasks/components/TaskForm.tsx                                                                                                            | AR-B3 centralize domain constants/unions             |
|    54 | Brittle UI Status Mapping (Magic String Manipulation)                | src/features/dashboard/components/ProjectCard.tsx                                                                                                     | AR-B3 centralize domain constants/unions             |
|    58 | Fragmented Domain Logic (DONE vs. COMPLETED)                         | src/features/dashboard/components/ProjectCard.tsx, src/features/projects/components/ProjectHeader.tsx                                                 | AR-B3 centralize domain constants/unions             |
|    60 | Brittle Native DOM Event Triggers for React State                    | src/features/projects/components/ProjectHeader.tsx                                                                                                    | AR-B4 replace DOM hacks with React/router patterns   |
|    62 | SPA Architecture Break (`window.location.href`)                      | src/features/projects/components/EditProjectModal.tsx                                                                                                 | AR-B4 replace DOM hacks with React/router patterns   |
|    63 | Domain Logic Leakage in UI Presentation Layer                        | src/features/tasks/components/TaskDetailsView.tsx                                                                                                     | AR-B3 centralize domain constants/unions             |
|    65 | Silent Fallback Anti-Pattern                                         | src/features/tasks/components/TaskDetailsPanel.tsx                                                                                                    | AR-B4 replace DOM hacks with React/router patterns   |
|    81 | FSD Lateral Boundary Violation (`tasks` depending on `library`)      | src/features/tasks/components/TaskForm.tsx                                                                                                            | AR-B2 remove cross-feature imports; lift composition |
|    84 | Hardcoded Payload Identifiers (Magic Strings in DnD)                 | src/features/dashboard/components/ProjectPipelineBoard.tsx                                                                                            | AR-B3 centralize domain constants/unions             |
|    98 | Hardcoded Environment Sniffing in UI Providers                       | src/app/contexts/AuthContext.tsx                                                                                                                      | AR-B4 replace DOM hacks with React/router patterns   |
|   101 | Database Schema Property Mismatch (`name` vs `title`)                | src/features/dashboard/components/ProjectCard.tsx                                                                                                     | AR-B3 centralize domain constants/unions             |

## Date handling and time semantics

### Why its problematic

The `Date()` constructor and `Date.parse()` accept "standard" date-time strings,
but implementations may also accept non-standard formats differently; relying on
raw parsing increases cross-browser inconsistency risk. `toISOString()` always
serializes as UTC (`Z`). If your domain semantics are date-only or
local-calendar-based, mixing `toISOString()` and local parsing easily produces
off-by-one-day errors when users are not in UTC.

Given the repo intent to use a `date-engine` wrapper, bypassing it defeats the
point: you lose a single place to enforce "date-only vs datetime" rules,
timezone policy, and parsing constraints.

### Recommended patterns

- Define and document two distinct primitives:
  - Date-only: `"YYYY-MM-DD"` (calendar date)
  - Date-time: ISO date-time string with timezone (usually UTC), e.g.
    `"YYYY-MM-DDTHH:mm:ss.sssZ"`
- Ban direct `new Date(string)` in app code:
  - parse only via the wrapper to guarantee accepted input formats and timezone
    behavior.
- Ban direct `.toISOString()` outside the wrapper:
  - wrapper decides whether to return date-only or datetime.

Use MDN as baseline for platform behavior, then enforce your domain policy in
`date-engine`.

Example wrapper sketch:

```ts
// shared/lib/date-engine.ts
export type IsoDate = `${number}-${number}-${number}`; // tighten if desired

export function nowUtcIso(): string {
  return new Date().toISOString(); // centralized, so it can be swapped later
}

export function parseIsoDateTime(input: string): Date | null {
  // Only accept ISO-ish strings you expect; reject non-standard formats.
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toIsoDateOnly(date: Date): IsoDate {
  // policy decision: convert to UTC date-only or local date-only (pick one)
  return date.toISOString().slice(0, 10) as IsoDate;
}
```

### Where to apply in this repo

The issue list documents multiple bypasses of the wrapper, including:

- Raw `new Date(dateString)` in UI components and API client (Issues 5, 45).
- Raw `new Date().toISOString()` for `updated_at` and E2E user creation (Issues
  5, 13, 64).

Issue-to-recipe mapping for this theme:

| Issue | Title                                                          | Where                                                                                  | Recipe                                      |
| ----: | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------- |
|     4 | Form Payload Strictness (`Record<string, unknown>`)            | src/features/projects/hooks/useProjectMutations.ts, src/shared/api/planterClient.ts    | DT-C2 normalize date-only vs datetime       |
|     5 | Date-Engine Centralization                                     | src/features/tasks/components/board/BoardTaskCard.tsx, src/shared/api/planterClient.ts | DT-C1 route all parsing through date-engine |
|    13 | Date-Engine Wrapper Bypass (Raw Date Instantiation)            | src/app/contexts/AuthContext.tsx                                                       | DT-C3 replace toISOString with wrapper      |
|    45 | Browser-Native Date Parsing Risk                               | src/shared/api/planterClient.ts                                                        | DT-C1 route all parsing through date-engine |
|    52 | Distributed Transaction / Manual Rollback Anti-Pattern         | src/shared/api/planterClient.ts                                                        | DT-C2 normalize date-only vs datetime       |
|    64 | Date-Engine Bypass in Project Mutations                        | src/features/projects/hooks/useProjectMutations.ts                                     | DT-C3 replace toISOString with wrapper      |
|    77 | Unscalable Network & Memory Waterfall (`fetchChildren`)        | src/shared/api/planterClient.ts                                                        | DT-C2 normalize date-only vs datetime       |
|    79 | Magic String Fallback Bypassing Domain Constants               | src/shared/api/planterClient.ts                                                        | DT-C2 normalize date-only vs datetime       |
|    87 | Missing Network Cancellation (No AbortSignal Support)          | src/shared/api/planterClient.ts                                                        | DT-C2 normalize date-only vs datetime       |
|    88 | O(N^2) Complexity in Task Tree Traversal                       | src/shared/api/planterClient.ts                                                        | DT-C2 normalize date-only vs datetime       |
|    93 | Template Literal String Injection ("undefined" Classes)        | src/features/dashboard/components/ProjectPipelineBoard.tsx                             | DT-C2 normalize date-only vs datetime       |
|    96 | `@ts-expect-error` Compiler Blinding                           | src/shared/api/planterClient.ts                                                        | DT-C2 normalize date-only vs datetime       |
|    97 | ESLint Rule Evasion (Breaking Automated Lockdown)              | src/app/contexts/AuthContext.tsx                                                       | DT-C2 normalize date-only vs datetime       |
|   100 | Aggressive Global State Purging (Environment Leakage Risk)     | src/app/contexts/AuthContext.tsx                                                       | DT-C2 normalize date-only vs datetime       |
|   104 | Domain Entity Pollution with Transient UI State                | src/features/tasks/components/TaskItem.tsx                                             | DT-C2 normalize date-only vs datetime       |
|   105 | Accessibility and DOM Standard Violation (Non-Form Submission) | src/features/tasks/components/TaskForm.tsx                                             | DT-C2 normalize date-only vs datetime       |

## Forms and validation contracts

### Why its problematic

Ad-hoc `Record<string, string>` form payloads and manual validators create:

- mismatches between UI fields and DB types,
- coercion bugs (for example `parseInt(x) || 3` breaks legitimate `0`), and
- propagation of untyped values into the API layer.

Schema-first form validation with Zod + React Hook Form is the standard path to
keep runtime validation and TypeScript types in sync. The React Hook Form
resolver ecosystem explicitly exists to integrate schema validators like Zod and
standardize error mapping.

### Recommended patterns

- A Zod schema is the source of truth for each form:
  - `type FormData = z.infer<typeof Schema>`
- React Hook Form uses `resolver: zodResolver(Schema)` so validation is
  automatic and errors are structured.
- Separate "form model" from "db row model":
  - Form model can include UI-only fields, coercion, defaults.
  - DB model uses generated types from `database.types`.

Example: eliminate `parseInt(...) || 3` falsy bug via schema coercion and
`min(0)`:

```ts
import { z } from "zod";

const SettingsSchema = z.object({
  dueSoonThreshold: z.coerce.number().int().min(0).default(3),
});

type SettingsForm = z.infer<typeof SettingsSchema>;

// In submit handler, dueSoonThreshold is already a number, including 0.
```

### Where to apply in this repo

The list identifies multiple form contract gaps:

- Manual validators and `Record<string, string>` pipelines in project settings
  modal (Issues 56, 48).
- `Record<string, unknown>` payloads for auth signup/profile updates and project
  settings (Issues 7, 4, 70).
- Task form handler typed as DOM `FormEventHandler` instead of a typed submit
  contract (Issue 22).
- Task form accepting `Partial<TaskRow>` instead of a strict form type (Issue
  28).

Issue-to-recipe mapping for this theme:

| Issue | Title                                                         | Where                                                                                                                                      | Recipe                                   |
| ----: | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
|     7 | Form Payload Strictness (`Record<string, ...>` & Loose Types) | src/app/contexts/AuthContext.tsx, src/features/projects/components/EditProjectModal.tsx, src/features/tasks/components/TaskDetailsView.tsx | FM-D2 strict form payload adapters       |
|     8 | Lingering Type Assertions (`as Type`)                         | src/app/contexts/AuthContext.tsx, src/features/tasks/components/TaskDetailsView.tsx                                                        | FM-D2 strict form payload adapters       |
|    10 | Weak State Typing in Unified Panels                           | src/features/tasks/components/TaskDetailsPanel.tsx                                                                                         | FM-D2 strict form payload adapters       |
|    20 | Missed `Record<string, ...>` Cleanup in Data Aggregation      | src/features/dashboard/components/ProjectPipelineBoard.tsx                                                                                 | FM-D2 strict form payload adapters       |
|    22 | Form Event Handler Type Stripping                             | src/features/tasks/components/TaskForm.tsx                                                                                                 | FM-D1 RHF+Zod schemas                    |
|    24 | Incomplete Error Typing in Data Mutations                     | src/features/tasks/hooks/useTaskMutations.ts, src/shared/api/planterClient.ts                                                              | FM-D2 strict form payload adapters       |
|    28 | "Strict Form Types" Claim vs. `Partial<DatabaseRow>` Reality  | src/features/tasks/components/TaskForm.tsx                                                                                                 | FM-D2 strict form payload adapters       |
|    35 | Type-Masking Mutation Variables (`as TaskInsert`)             | src/features/tasks/hooks/useTaskMutations.ts                                                                                               | FM-D2 strict form payload adapters       |
|    37 | RPC Payload Strictness Bypass (`Record<string, unknown>`)     | src/shared/api/planterClient.ts                                                                                                            | FM-D2 strict form payload adapters       |
|    38 | Type Coercion for Database Updates (`as TaskUpdate`)          | src/features/projects/hooks/useProjectMutations.ts                                                                                         | FM-D3 handle coercion without falsy bugs |
|    42 | Weak Typing for Critical Database Updates (`status: string`)  | src/shared/api/planterClient.ts                                                                                                            | FM-D2 strict form payload adapters       |
|    43 | Default Parameter Type-Masking (`as string                    | null`)                                                                                                                                     | src/shared/api/planterClient.ts          |
|    46 | Lateral FSD Violation (`projects` depending on `tasks`)       | src/features/projects/components/EditProjectModal.tsx                                                                                      | FM-D2 strict form payload adapters       |
|    48 | Logic Bug Caused by Loose Form Typing (`                      |                                                                                                                                            | ` Fallback)                              |
|    49 | Environment Variable Type Masking (`as string`)               | src/features/auth/components/LoginForm.tsx                                                                                                 | FM-D2 strict form payload adapters       |
|    56 | Missing Zod Implementation (Breaking "Strict Form" Claims)    | src/features/projects/components/EditProjectModal.tsx                                                                                      | FM-D1 RHF+Zod schemas                    |
|    57 | Fatal Runtime Crash Risk via Array Type-Masking               | src/features/tasks/hooks/useTaskMutations.ts                                                                                               | FM-D2 strict form payload adapters       |
|    66 | Fatal Runtime Crash Risk (`planter.projects` is undefined)    | src/features/projects/hooks/useProjectMutations.ts                                                                                         | FM-D2 strict form payload adapters       |
|    67 | Interface Contract Violation (Liskov Substitution Principle)  | src/shared/api/planterClient.ts                                                                                                            | FM-D2 strict form payload adapters       |
|    69 | Silent Type Mismatch in Batch Upserts                         | src/features/projects/hooks/useProjectMutations.ts                                                                                         | FM-D2 strict form payload adapters       |
|    70 | Explicit Retention of `Record<string, unknown>` in Mutations  | src/features/projects/hooks/useProjectMutations.ts                                                                                         | FM-D2 strict form payload adapters       |
|    71 | Missing Interface Import (Compilation Error Risk)             | src/shared/api/planterClient.ts                                                                                                            | FM-D2 strict form payload adapters       |
|    74 | Broken Mutation Return Pipeline (`unknown` Infection)         | src/features/projects/hooks/useProjectMutations.ts                                                                                         | FM-D2 strict form payload adapters       |
|    83 | Loose Structural Typing Instead of Entity Models              | src/features/tasks/components/TaskForm.tsx                                                                                                 | FM-D2 strict form payload adapters       |
|    91 | Polymorphic Mutation Returns Breaking API Predictability      | src/features/projects/hooks/useProjectMutations.ts                                                                                         | FM-D2 strict form payload adapters       |

## Performance and cancellation

### Why its problematic

The issues describe classic frontend hotspots:

- O(N*M) work in render paths (especially drag-and-drop rendering that
  re-renders rapidly) and client-side tree building at O(N^2).
- Unbounded concurrent updates (`Promise.all` recursion) that can trip rate
  limits and degrade UX.
- Missing `AbortSignal` plumbing prevents TanStack Query from canceling
  in-flight requests on unmount/navigation, wasting bandwidth and increasing
  race risk.

TanStack Query provides an `AbortSignal` to query functions and documents how
cancellation is expected to work.

### Recommended patterns

- Pre-index once, render many:
  - Build `tasksByProjectId` and `projectsByStatus` maps in `useMemo`.
- Trees:
  - Build `parentId -> children[]` index in O(N) and traverse without repeated
    filtering; or move to DB (recursive CTE / RPC) so you do not download whole
    projects just to show a subtree.
- Concurrency:
  - Replace `Promise.all(children.map(...))` with a concurrency-limited queue,
    or a server-side "cascade update" RPC.
- Cancellation:
  - Thread `signal?: AbortSignal` through all network helpers
    (`rawSupabaseFetch`, entity methods) and pass the signal to `fetch`.
  - In TanStack Query `queryFn`, forward the signal.

Example: render-time bucketing

```ts
const tasksByProjectId = useMemo(() => {
  const map: Record<string, TaskRow[]> = {};
  for (const t of tasks) {
    const pid = t.project_id ?? "unassigned";
    (map[pid] ??= []).push(t);
  }
  return map;
}, [tasks]);

// render
const projectTasks = tasksByProjectId[project.id] ?? [];
```

Example: O(N) tree index

```ts
const childrenByParent = new Map<string | null, TaskRow[]>();
for (const t of projectTasks) {
  const parent = t.parent_task_id ?? null;
  const arr = childrenByParent.get(parent);
  if (arr) arr.push(t);
  else childrenByParent.set(parent, [t]);
}
```

### Where to apply in this repo

The list flags:

- Render-time filtering in `ProjectPipelineBoard` (Issue 86).
- O(N^2) subtree building in `planterClient.fetchChildren` (Issues 77, 88).
- Unbounded recursive updates via `Promise.all` (Issue 78).
- Missing abort support in network layer (Issue 87).

Issue-to-recipe mapping for this theme:

| Issue | Title                                                           | Where                                                      | Recipe                                |
| ----: | --------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------- |
|    25 | Orphaned Logic / Unfinished Realtime Refactoring                | src/features/dashboard/components/ProjectPipelineBoard.tsx | PF-E1 memoize and pre-index data      |
|    52 | Distributed Transaction / Manual Rollback Anti-Pattern          | src/shared/api/planterClient.ts                            | PF-E1 memoize and pre-index data      |
|    77 | Unscalable Network & Memory Waterfall (`fetchChildren`)         | src/shared/api/planterClient.ts                            | PF-E2 server-side tree or O(N) index  |
|    78 | Rate-Limit Risk (Unbounded Concurrent Network Requests)         | src/shared/api/planterClient.ts                            | PF-E3 cancellation+concurrency limits |
|    86 | Performance Degradation (O(N*M) Rendering in Drag & Drop)       | src/features/dashboard/components/ProjectPipelineBoard.tsx | PF-E1 memoize and pre-index data      |
|    87 | Missing Network Cancellation (No AbortSignal Support)           | src/shared/api/planterClient.ts                            | PF-E3 cancellation+concurrency limits |
|    88 | O(N^2) Complexity in Task Tree Traversal                        | src/shared/api/planterClient.ts                            | PF-E2 server-side tree or O(N) index  |
|    89 | Portal React Context Breakage Risk                              | src/features/dashboard/components/ProjectPipelineBoard.tsx | PF-E1 memoize and pre-index data      |
|    90 | Unhandled Promise Rejections in Auth Observer                   | src/app/contexts/AuthContext.tsx                           | PF-E1 memoize and pre-index data      |
|    93 | Template Literal String Injection ("undefined" Classes)         | src/features/dashboard/components/ProjectPipelineBoard.tsx | PF-E1 memoize and pre-index data      |
|    94 | Hidden Context Dependencies (Module Isolation Failure)          | src/features/tasks/components/TaskForm.tsx                 | PF-E1 memoize and pre-index data      |
|    95 | Type-Blind Metadata Injection into Global Context               | src/app/contexts/AuthContext.tsx                           | PF-E1 memoize and pre-index data      |
|    99 | Error Information Destruction (Stringified Errors)              | src/shared/api/planterClient.ts                            | PF-E1 memoize and pre-index data      |
|   102 | Optional Method Contract Violation in Core Mutations            | src/features/tasks/hooks/useTaskMutations.ts               | PF-E1 memoize and pre-index data      |
|   103 | Type-Masking Drag-and-Drop Contracts (`[key: string]: unknown`) | src/features/tasks/components/TaskItem.tsx                 | PF-E1 memoize and pre-index data      |

## Auth, errors, and production hygiene

### Why its problematic

Auth/session correctness is a consistency problem: you need a single source of
truth for "am I signed in" and deterministic cleanup on sign-out. The issue list
indicates multiple paths where local state can desync from server state and
where E2E bypass logic bleeds into production behavior.

For auth workflows using entity["company","Supabase","backend-as-a-service"],
the SDK provides primitives that manage session persistence, token refresh, and
auth events. Relying on ad-hoc fetches and localStorage spelunking increases
breakage risk and can bypass token refresh behavior.

On logout specifically, Supabase documents that `signOut()` inside the browser
removes session items from local storage and triggers a `SIGNED_OUT` event. If
your UI does not clear its in-memory user state regardless of network outcome,
you can show a "ghost logged-in" UI.

For errors, collapsing structured REST errors into a single string loses
actionable fields (codes/details) and makes programmatic handling (RLS vs
validation vs 429) harder.

### Recommended patterns

- Auth state machine:
  - Subscribe to auth events (`onAuthStateChange`) and update your app state
    based on those events; Supabase documents `TOKEN_REFRESHED` and other
    lifecycle events explicitly.
  - Use SDK functions (`getUser`, `getSession`, `setSession`, `signOut`) instead
    of manual HTTP calls to auth endpoints, so refresh and persistence rules
    stay correct.
- Logout invariants:
  - Clear local UI user state in a `finally` (or equivalent) so UI cannot remain
    authenticated after signout attempts, even on network failures.
- Test-only logic:
  - Remove E2E bypass from production bundle paths. Best-case: MSW or test
    runner injection; at minimum: a build-time flag that strips the code, not a
    runtime query-param check.
- Structured error model:
  - Parse JSON error bodies when present, preserve `code/message/details`, and
    standardize a single `AppError` shape for UI.

Example: logout cleanup invariant

```ts
async function signOutSafely(): Promise<void> {
  try {
    await supabase.auth.signOut(); // server + local storage cleanup
  } finally {
    // UI invariant: local state must be unauthenticated after this returns
    setUser(null);
    setSession(null);
  }
}
```

### Content safety

One issue documents `dangerouslySetInnerHTML` still in use for phase
descriptions. Even with sanitization, this should be treated as a last resort
because it reintroduces XSS attack surface into the UI. Prefer rendering plain
text or a controlled rich-text renderer that maps a safe AST to React elements.

### Where to apply in this repo

The issue list documents:

- E2E bypass code embedded in production auth provider and signout path
  inconsistently gated (Issues 40, 82).
- Signout desync risk where local user is not cleared on failure (Issue 9).
- Manual fetch to auth endpoints (bypassing SDK refresh/persistence) (Issue 72).
- Swallowed errors and stringified error payloads (Issues 80, 99).
- Query-string injection risk due to missing encoding in PostgREST URL
  construction (Issue 76).

Issue-to-recipe mapping for this theme:

| Issue | Title                                                        | Where                                          | Recipe                                         |
| ----: | ------------------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------- |
|     2 | XSS Eradication (`dangerouslySetInnerHTML`)                  | src/features/projects/components/PhaseCard.tsx | AU-F5 remove dangerous HTML rendering          |
|     9 | Auth `signOut` Desync Risk                                   | src/app/contexts/AuthContext.tsx               | AU-F2 fix logout invariants and storage safety |
|    40 | E2E Test Code Leaking into Production Application Logic      | src/app/contexts/AuthContext.tsx               | AU-F3 remove test code from prod path          |
|    72 | Bypassing Supabase Client for Auth (Breaking Token Rotation) | src/shared/api/planterClient.ts                | AU-F4 structured errors and no swallow         |
|    76 | Query String Injection Vulnerability (Missing URL Encoding)  | src/shared/api/planterClient.ts                | AU-F4 structured errors and no swallow         |
|    80 | Empty Catch Blocks Swallowing Critical Authentication Errors | src/shared/api/planterClient.ts                | AU-F4 structured errors and no swallow         |
|    82 | Production Leakage of E2E Bypass State (Security Risk)       | src/app/contexts/AuthContext.tsx               | AU-F3 remove test code from prod path          |

## Repo-wide scan guidance you should enforce in CI

The attached issue list already surfaces systemic hotspots and repeated patterns
across a small set of files. Because this remediation needs to prevent relapse,
make the scan mechanical and blocking in CI (and keep it fast):

```bash
# Type masks
rg -n "as any|as unknown|unknown\[\]|Record<string|@ts-expect-error" src

# FSD boundary violations
rg -n "from '@/app/|from \"@/app/\"" src/features
rg -n "from '@/features/|from \"@/features/\"" src/features

# Date bypass
rg -n "new Date\\(|toISOString\\(" src

# Direct supabase queries / raw fetches
rg -n "supabase\\.from\\(|rawSupabaseFetch\\(" src

# Render-time heavy ops (rough heuristic)
rg -n "\\.filter\\(.*\\)" src/features | rg -n "components|ui"
```

The FSD layer rule is explicit: slices can only import downward by layer;
enforce this with lint rules and treat violations as build failures. For network
cancellation, TanStack Query expects `AbortSignal` support in query functions;
treat "no signal plumbing" as a correctness bug, not an optimization.
