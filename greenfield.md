# PlanterPlan-Alpha Greenfield Rewrite Candidate Schema-Preserving

## Executive summary

This rewrite candidate is a from-scratch frontend codebase (and only additive, backward-compatible database changes if absolutely required) that continues to use the existing Supabase PostgREST + RPC surface and the existing production Postgres schema as a hard contract. The goal is to reduce long-term risk by removing the current accretion of mixed data-access patterns, inconsistent domain invariants, and partial features (notably around membership/invites, relationships/dependencies, and ordering) while preserving all production data and all existing table/function contracts. citeturn6view0turn8view2turn19view0turn3view0

What stays identical (hard contracts):
- Database objects and signatures found in `docs/db/schema.sql` are treated as immutable contracts for the rewrite: tables, columns, views, constraints, RLS policies, and RPC signatures must continue to work. citeturn6view0turn8view2
- Supabase Auth remains the identity provider and Supabase RLS remains the enforcement mechanism; the app must never rely on client-side role state to grant data access. citeturn8view2turn19view0
- The app continues to call the existing SECURITY DEFINER RPCs (notably `clone_project_template`, `invite_user_to_project`, `get_invite_details`, `initialize_default_project`) instead of attempting to re-implement privileged flows client-side. citeturn6view0turn8view1

What changes (architecture and boundaries):
- One data access strategy (typed Supabase client + a small PostgREST wrapper for retries/timeouts), one cache layer (TanStack Query), one domain model boundary per feature (Projects, Tasks, People, Resources, Invites/Memberships). citeturn19view0
- A compatibility layer that explicitly codifies schema invariants (ordering by `position`, origin semantics, cloning semantics, membership semantics) and catches contract drift in CI before deploy.
- A staged cutover plan: run the old and new apps in parallel against the same Supabase project, rolling out read-only first, then writes behind feature flags, with instant rollback by routing. (No data rewrite, no dual-write.) citeturn8view2

Start Here (first 48 hours of implementation work):
- Confirm the schema contract surface:
  - Parse `docs/db/schema.sql` into an explicit list of contracts (tables/columns/views/functions/policies) and check it into the new repo as a generated `SCHEMA_CONTRACT.md` for CI diffing. citeturn6view0turn8view2
  - Reconcile `docs/db/schema.sql` against the `/supabase` directory (migrations/functions/policies) if present; if they differ, treat production introspection as source-of-truth and update only additively. (See Stop Conditions and Discrepancies below.) citeturn3view0turn6view0
- Scaffold the new repo:
  - Vite + React + TypeScript + Tailwind v4 + Radix UI stack already used by the current repo (minimize UI redesign risk). citeturn19view0
  - Add CI (lint + typecheck + unit + e2e smoke), and generate typed DB definitions (Supabase typegen) pinned to the current schema.
- Implement Auth + routing + a single read-only vertical slice:
  - Login -> dashboard project list -> open project -> render task tree read-only using PostgREST (`tasks`) and the RLS contract. citeturn8view2turn19view0

## Current-state extraction grounded in repo evidence

Assumptions (only where repo evidence is incomplete):
- The `/supabase` directory content could not be fully enumerated via the available browsing surface; discrepancies are flagged as "unknown" and a safe verification workflow is provided. citeturn3view0

Feature inventory (what exists today, based on code and schema)
- Task tree model (projects are tasks):
  - Schema: `public.tasks` is a self-referential adjacency-list with `parent_task_id` and a denormalized `root_id`, and a sortable `position` field. citeturn6view0
  - Code: project/task fetching hydrates trees by loading all tasks for a `root_id` scope and building a client-side tree. Evidence excerpt:
    ```text
    File: src/features/tasks/services/taskService.js
    - fetchTaskChildren(): fetches TaskWithResources.get(taskId), derives projectRootId = root_id || id, then filters TaskWithResources by root_id and BFS-filters descendants in-memory.
    ```
    ```text
    File: src/features/tasks/hooks/useTaskQuery.js
    - fetchProjectDetails(projectId): calls fetchTaskChildren(projectId), stores descendants (excluding the root) in hydratedProjects[projectId].
    ```
- Templates vs instances:
  - Schema: `tasks.origin` is constrained to `'instance' | 'template'`. citeturn6view0
  - Schema: a view `public.view_master_library` selects tasks where `origin = 'template'`. citeturn6view0
  - Code: templates are fetched from `tasks_with_primary_resource` filtered by `creator` and `origin='template'` and `parent_task_id IS NULL`. Evidence excerpt:
    ```text
    File: src/features/tasks/hooks/useTaskQuery.js
    - supabase.from('tasks_with_primary_resource').select('*').eq('creator', user.id).eq('origin','template').is('parent_task_id', null)
    ```
- Deep clone behavior:
  - Schema: `public.clone_project_template(...)` is a SECURITY DEFINER RPC that:
    - Identifies a template subtree via recursive CTE,
    - Creates temp maps to remap task IDs and resource IDs,
    - Inserts cloned tasks and cloned resources,
    - Remaps `parent_task_id`, `root_id`, and `primary_resource_id`,
    - Shifts dates by an interval derived from `p_start_date` vs template root `start_date`,
    - Returns JSON including `new_root_id`, `root_project_id`, `tasks_cloned`. citeturn6view0turn7view2
  - Code: `deepCloneTask()` calls `rpc('clone_project_template', { p_template_id, p_new_parent_id, ... })`. Evidence excerpt:
    ```text
    File: src/features/tasks/services/taskCloneService.js
    - deepCloneTask(): client.rpc('clone_project_template', rpcParams)
    ```
- RBAC / memberships / invites:
  - Schema: `public.project_members(project_id, user_id, role)` with role constraint `owner|editor|coach|viewer|limited`. citeturn6view0
  - Schema: `public.project_invites(project_id, email, role, token, expires_at)` with uniqueness per (project_id,email). citeturn6view0
  - Schema: helper functions:
    - `public.is_admin(p_user_id)` checks `public.admin_users`. citeturn6view0
    - `public.has_project_role(p_project_id, p_user_id, p_allowed_roles)` checks `project_members`. citeturn6view0
  - Schema: `public.invite_user_to_project(p_project_id, p_email, p_role)` SECURITY DEFINER:
    - Gate: inviter must be owner/editor (or admin),
    - Editor cannot assign owner,
    - If the email exists in `auth.users`, upsert into `project_members`,
    - Else upsert into `project_invites` and return token. citeturn6view0turn7view0
  - Code: membership invite-by-email uses RPC via PostgREST `/rpc/invite_user_to_project`. Evidence excerpt:
    ```text
    File: src/shared/api/planterClient.js
    - Project.addMemberByEmail(): rawSupabaseFetch('rpc/invite_user_to_project', body {p_project_id,p_email,p_role})
    ```
- People CRM lite:
  - Schema: `public.people(project_id, first_name, last_name, email, phone, role, status, notes, ...)` with RLS policies allowing project members to view, and owners/editors to manage. citeturn6view0turn8view2
  - Code: `peopleService` does CRUD on `people` via `supabase.from('people')...`. Evidence excerpt:
    ```text
    File: src/features/people/services/peopleService.js
    - getPeople(projectId): select * from people where project_id=...
    - addPerson/updatePerson/deletePerson: standard supabase CRUD
    ```
- Resources:
  - Schema: `public.task_resources(task_id, resource_type, resource_url, resource_text, storage_path, storage_bucket)` and `tasks.primary_resource_id` pointer. citeturn6view0turn8view2
  - Code: resources are listed/created/deleted via `planter.entities.TaskResource` and primary resource set by updating `tasks.primary_resource_id`. Evidence excerpt:
    ```text
    File: src/features/tasks/services/taskResourcesService.js
    - createTaskResource(): inserts into task_resources with resource_type/resource_url/resource_text/storage_path
    - setPrimaryResource(): updates tasks.primary_resource_id
    ```
- Drag/drop ordering:
  - Schema: ordering uses `tasks.position integer`. citeturn6view0
  - Code: list view uses dnd-kit sortable; new positions are computed between neighbors and persisted via PATCH updates; renormalization exists but is not automatically triggered on collision. Evidence excerpt:
    ```text
    File: src/features/task-drag/lib/positionService.js
    - calculateNewPosition(prev,next): returns mid or null if gap too small
    - updateTasksBatch(): Promise.all Task.update(id, data) (explicitly avoids upsert to prevent RLS INSERT errors)
    ```
- Scheduling/dates:
  - Schema: tasks include `start_date`, `due_date`, `days_from_start`, `location`, plus triggers for updated_at and phase unlocking. citeturn6view0turn7view1
  - Schema: `clone_project_template` shifts dates by an interval derived from the template root and `p_start_date`. citeturn6view0turn7view2
  - Code: mutations compute schedules from `days_from_start`, allow manual overrides, and also attempt parent date aggregation. Evidence excerpt:
    ```text
    File: src/features/tasks/hooks/useTaskMutations.js
    - calculateScheduleFromOffset(...)
    - updateParentDates(parentId): recompute parent min/max dates from children (calls calculateMinMaxDates)
    ```
- Completion semantics:
  - Schema: tasks have both `status text` and `is_complete boolean`, and a trigger `handle_phase_completion()` that unlocks the next sibling by setting `is_locked=false` when status changes to 'completed'. citeturn6view0turn7view1
- Auth/session:
  - Schema: admin detection is via RPC `is_admin`. citeturn6view0
  - Code: `AuthContext` calls `supabase.rpc('is_admin', {p_user_id})` and sets `user.role` client-side; in local dev it sets default role quickly and runs RPC in background. Evidence excerpt:
    ```text
    File: src/app/contexts/AuthContext.jsx
    - onAuthStateChange -> handleSession -> supabase.rpc('is_admin', { p_user_id: session.user.id })
    ```

Data/API inventory from `docs/db/schema.sql` (source-of-truth in repo)

Tables (key columns and relationships)
- `public.tasks`
  - Primary key: `id uuid`
  - Hierarchy: `parent_task_id uuid -> tasks(id)`, `root_id uuid -> tasks(id)` citeturn6view0
  - Identity and assignment: `creator uuid -> auth.users(id)`, `assignee_id uuid -> auth.users(id)` citeturn6view0
  - Ordering: `position integer` citeturn6view0
  - Template/instance: `origin text CHECK (origin IN ('instance','template'))`, `template text` citeturn6view0
  - Status and gating: `status text`, `is_complete boolean`, `is_locked boolean`, `is_premium boolean` citeturn6view0
  - Scheduling: `start_date timestamptz`, `due_date timestamptz`, `days_from_start integer`, `location text` citeturn6view0
  - Resources pointer: `primary_resource_id uuid` citeturn6view0
  - Indexes: `idx_tasks_root_id`, `idx_tasks_parent_id`, `idx_tasks_is_locked`, `idx_tasks_is_premium`, `idx_tasks_creator`, `idx_tasks_assignee_id` citeturn6view0
- `public.project_members`
  - `project_id uuid -> tasks(id)`, `user_id uuid -> auth.users(id)`, `role CHECK (...)`, unique (project_id,user_id) citeturn6view0
- `public.project_invites`
  - `project_id uuid -> tasks(id)`, `email text`, `role CHECK (...)`, `token uuid`, `expires_at`, unique (project_id,email) citeturn6view0
- `public.task_relationships`
  - `project_id uuid -> tasks(id)`, `from_task_id uuid -> tasks(id)`, `to_task_id uuid -> tasks(id)`, `type CHECK (blocks|relates_to|duplicates)` citeturn6view0
- `public.people`
  - `project_id uuid -> tasks(id)` plus CRM fields and a `status` CHECK set citeturn6view0
- `public.task_resources`
  - `task_id uuid -> tasks(id)` and resource payload fields; indexed by `task_id` citeturn6view0
- `public.admin_users`
  - `user_id uuid -> auth.users(id)` plus email and audit columns; RLS enabled citeturn6view0

Views
- `public.tasks_with_primary_resource`
  - Adapter view selecting `tasks.*` plus legacy resource columns filled with NULLs; grants SELECT to `authenticated, anon, service_role`. citeturn6view0
- `public.view_master_library`
  - Selects key columns from tasks where `origin='template'`; grants SELECT to `authenticated, anon, service_role`. citeturn6view0

RPCs / functions / triggers
- `public.is_admin(p_user_id uuid) -> boolean` SECURITY DEFINER; checks `admin_users`. citeturn6view0
- `public.has_project_role(p_project_id uuid, p_user_id uuid, p_allowed_roles text[]) -> boolean` SECURITY DEFINER; checks `project_members`. citeturn6view0
- `public.clone_project_template(...) -> jsonb` SECURITY DEFINER; deep clone subtree + resources + remap ids + date shifting. citeturn6view0turn7view2
- `public.invite_user_to_project(p_project_id uuid, p_email text, p_role text) -> jsonb` SECURITY DEFINER; member upsert or invite creation. citeturn7view0
- `public.get_invite_details(p_token uuid) -> jsonb` SECURITY DEFINER; granted to `anon` to retrieve invite metadata safely. citeturn7view1
- Triggers:
  - `handle_phase_completion` unlocks next sibling task by `position` when status changes to `completed`. citeturn7view1
  - `handle_updated_at` sets `updated_at = now()` for tasks and people. citeturn7view1
  - `set_root_id_from_parent` sets a child task root_id from its parent on insert/update of parent_task_id. citeturn7view1

RLS policies and grants (intent summary)
- `tasks`
  - SELECT: creator OR has_project_role(COALESCE(root_id,id), uid, [owner,editor,coach,viewer,limited]) citeturn8view2
  - INSERT:
    - allow root project creation when `root_id IS NULL AND parent_task_id IS NULL AND creator=uid`
    - allow inserts within projects for owner/editor via has_project_role(root_id,...)
    - templates are insertable only by admins (`origin != 'template' OR is_admin(uid)`) citeturn8view2
  - UPDATE: creator OR has_project_role(COALESCE(root_id,id), uid, [owner,editor]) and templates only by admin citeturn8view2
  - DELETE: creator OR has_project_role(COALESCE(root_id,id), uid, [owner,editor]) citeturn8view2
- `project_members`
  - SELECT: any project member (any role) or admin citeturn8view2
  - ALL (insert/update/delete): owner only or admin citeturn8view2
- `project_invites`
  - SELECT: owner/editor or admin citeturn8view2
  - INSERT: owner or admin; editor allowed only if inviting non-owner citeturn8view2
  - DELETE: owner/editor or admin citeturn8view2
- `people`
  - SELECT: any project member or admin citeturn8view2
  - ALL: owner/editor or admin citeturn8view2
- `task_relationships`
  - SELECT: any project member or admin citeturn8view2
  - ALL: owner/editor or admin citeturn8view2
- `task_resources`
  - SELECT: allowed if the user can access the parent task (creator or membership) or admin citeturn8view2
  - ALL: creator or owner/editor on the task project scope, or admin; grants include SELECT/INSERT/UPDATE/DELETE to authenticated, ALL to service_role citeturn8view2

Stop conditions and discrepancies detected (do not guess)
- Relationship RPC mismatch:
  - Code calls `rpc('get_task_relationships', ...)` but `docs/db/schema.sql` does not define `get_task_relationships`. Impact: TaskDependencies UI cannot function unless an out-of-band migration exists. Safe reconciliation: inspect `/supabase` migrations/functions OR introspect production and either (a) remove the call and query `task_relationships` directly, or (b) add the missing RPC as an additive function with the same name/signature used by code. citeturn6view0turn8view2
- Membership UI mismatch:
  - UI uses `project_members` but appears to treat members as having `name/email/phone` fields; `project_members` in schema only has `project_id,user_id,role`. Impact: member display and direct insert flows will fail under the contract schema. Safe reconciliation: in the rewrite, enforce that membership writes go through `invite_user_to_project` (RPC) and member display uses only fields available (user_id, role) unless an additive, explicitly-audited profile view/RPC is introduced. citeturn6view0turn7view0turn8view2
- Root_id invariants appear inconsistent across code and the clone RPC:
  - `clone_project_template` requires a non-null parent `root_id` when cloning under a parent, otherwise it raises. If project roots are created with `root_id IS NULL` (allowed by RLS), cloning a template subtree directly under the project root may fail. Impact: template-subtree insertion under root can be broken. Safe reconciliation: verify production function body vs schema.sql; if it matches schema.sql, either (a) adjust UI to clone under a non-root parent, or (b) add a backward-compatible function update that uses `COALESCE(parent.root_id, parent.id)` instead of rejecting null. citeturn6view0turn7view2turn8view2

## Target architecture proposal greenfield

Architecture options
- Option A: Vite + React + React Router + TanStack Query + typed Supabase client (recommended)
  - Pros: smallest delta from current dependency set; fastest to implement; keeps direct PostgREST/RPC; excellent test tooling.
  - Cons: still a client-heavy app; complex batch operations (reorder) remain multi-request unless you add additive RPCs.
  - Current repo already uses: Vite, React, react-router-dom, @tanstack/react-query, @supabase/supabase-js, dnd-kit, zod, Radix, Playwright/Vitest. citeturn19view0
- Option B: Next.js (App Router) + Supabase SSR
  - Pros: server-side rendering, server route handlers can centralize privileged workflows (but you must not bypass RLS with service_role except where explicitly intended); strong observability patterns.
  - Cons: adds a server tier and deployment complexity; larger rewrite surface; risk of accidentally introducing service-role data access.
- Option C: React Router "framework mode" (loaders/actions) + TanStack Query
  - Pros: more structured routing/data boundaries; can reduce manual loading states.
  - Cons: slightly higher learning curve and migration cost; still need careful caching integration.

Recommendation: Option A (Vite + React + TS + Router + TanStack Query)
Rationale: It preserves the current mental model and dependency footprint while allowing a strict, typed, testable data layer and explicit domain boundaries. It minimizes the probability of accidental schema/RPC drift and avoids a server tier that could accidentally weaken the RLS security story.

Chosen stack (concrete)
- Runtime: Vite + React (TypeScript), React Router (route components), TanStack Query. citeturn19view0
- Styling/UI:
  - Tailwind CSS v4, Radix UI primitives, existing shared UI pattern (button/card/dialog/etc). citeturn19view0
- Forms/validation:
  - React Hook Form + Zod schemas per domain command (CreateProject, CreateTask, InviteMember, AddPerson, AddResource).
- Testing:
  - Unit: Vitest
  - Component/integration: React Testing Library
  - E2E: Playwright citeturn19view0
- Error handling/UX:
  - react-error-boundary for route-level boundaries (already in use). citeturn19view0

Module boundaries (rules)
- src/app
  - routing, providers, layout shells, error boundaries
- src/shared
  - supabase client, typed DB models, query-key helpers, invariant helpers (position math, tree build), UI primitives
- src/features
  - features/projects: project list, create project, edit project settings, initialize default project via RPC
  - features/tasks: task tree, task CRUD, clone semantics, reorder semantics, completion/status semantics
  - features/people: CRM list/edit
  - features/resources: attachments + primary_resource_id management
  - features/memberships: invite member (RPC), accept invite (token flow), list members (minimum viable fields)
- Enforced rule: feature code cannot import other feature internals; it only imports from `shared` or its own feature modules.

Data access layer design (typed Supabase + query patterns)
- One client:
  - `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` as in the existing app. citeturn19view0
- Typed DB contract:
  - Generate `Database` types and bind `SupabaseClient<Database>`.
- Query keys (examples):
  - `['auth','session']`
  - `['projects','owned', userId, page]`
  - `['projects','joined', userId]`
  - `['project', projectId]`
  - `['projectTree', projectId]` (children tasks by `root_id`)
  - `['task', taskId]`
  - `['taskResources', taskId]`
  - `['people', projectId]`
- Mutation patterns:
  - Always set `updated_at` client-side only if the DB does not already do it in triggers. The schema has updated_at triggers for tasks and people. citeturn7view1
  - Reorder uses "optimistic local position update -> PATCH batch -> refetch projectTree on failure".

Authorization strategy (RLS-respecting)
- Principle: the client is untrusted; UI gating is convenience only; RLS is the enforcement boundary. citeturn8view2
- Membership writes:
  - Never insert/update `project_members` directly from the client in the rewrite.
  - Use `invite_user_to_project` for adding/updating membership, because it is SECURITY DEFINER and encodes escalation rules (editor cannot assign owner, etc). citeturn7view0turn8view2
- Template edits:
  - Respect the schema policy: templates (`origin='template'`) are only mutable by admin. The rewrite should enforce this in UI but depend on RLS for correctness. citeturn8view2

Offline/latency considerations
- Default: online-first.
- Optional: TanStack Query persistence (localStorage) ONLY for read caches, never for auth tokens or privileged data; keep behind a feature flag because RLS-driven 401/403 behavior must remain accurate.

Observability
- App-level:
  - Centralized error boundary + structured logging wrapper.
  - Add a single analytics hook layer (page view + key actions: clone, reorder, invite, add person).
- Network-level:
  - Wrap Supabase calls with request ids and log PostgREST errors including status/text (similar intent to the existing raw fetch wrapper). (Do not log secrets.)

ASCII architecture diagram (chosen option)

```text
Browser UI
  -> React Router routes (src/app)
    -> Feature modules (src/features/*)
      -> Data access (src/shared/supabase/*)
        -> Supabase JS client (PostgREST + RPC)
          -> Postgres (tables/views/functions)
            -> RLS policies enforce access
```

## Compatibility contract

Schema contracts the rewrite must honor (explicit)
- Tables and columns must remain compatible with:
  - `public.tasks` including (non-exhaustive but contract-critical):
    - hierarchy: id, parent_task_id, root_id
    - semantics: origin, status, is_complete, is_locked, is_premium
    - ordering: position
    - scheduling: start_date, due_date, days_from_start
    - ownership/assignment: creator, assignee_id
    - resources: primary_resource_id
    - timestamps: created_at, updated_at citeturn6view0turn7view1
  - `public.project_members`, `public.project_invites`, `public.people`, `public.task_resources`, `public.task_relationships`, `public.admin_users` citeturn6view0turn8view2
- Views must remain readable:
  - `public.tasks_with_primary_resource`
  - `public.view_master_library` citeturn6view0
- RPC signatures must remain callable (argument names matter for supabase-js RPC calls in practice):
  - `clone_project_template(p_template_id, p_new_parent_id, p_new_origin, p_user_id, p_title?, p_description?, p_start_date?, p_due_date?) -> jsonb` citeturn6view0turn7view2
  - `invite_user_to_project(p_project_id, p_email, p_role) -> jsonb` citeturn7view0
  - `get_invite_details(p_token) -> jsonb` (callable by anon) citeturn7view1
  - `initialize_default_project(p_project_id, p_creator_id) -> jsonb` citeturn7view1turn8view1
  - `is_admin(p_user_id) -> boolean` citeturn6view0

Behavioral contracts to preserve (and tighten)
- Ordering semantics:
  - Sibling tasks are ordered by ascending `position` (integer).
  - Reordering computes a new `position` between neighbors; if gaps collapse, a renormalization pass is required (existing code has the concept). citeturn6view0
- Cloning semantics:
  - Deep clone duplicates:
    - every task in the template subtree,
    - every `task_resources` row associated to those tasks,
    - `primary_resource_id` pointers remapped to the cloned resources,
    - parent/child relationships remapped to the cloned ids,
    - dates shifted by a computed interval (when provided). citeturn6view0turn7view2
- Completion semantics:
  - "Completed" status drives phase unlock behavior (trigger checks status change to 'completed' and unlocks the next sibling by position). citeturn7view1
  - The UI must treat `status` as authoritative for unlock behavior and keep `is_complete` consistent (see ambiguity below). citeturn7view1turn8view2
- Permission semantics:
  - Reads are allowed for creators and project members per RLS.
  - Writes inside a project are restricted to owner/editor (plus admin overrides), and invites follow the RPC gate. citeturn8view2turn7view0

Ambiguities and risk decisions (explicit)
- Dual completion fields (`status` vs `is_complete`):
  - Observed: schema uses both and triggers depend on `status='completed'`. citeturn7view1
  - Decision for rewrite: treat `status` as the only completion source-of-truth; always write `is_complete = (status === 'completed')` in the same mutation for consistency. Risk: existing rows may have drift. Mitigation: add a read-side normalizer (client) and a non-destructive, optional correction migration (additive SQL script) only after verifying drift in production.
- Root task `root_id` convention:
  - Observed: policies allow root projects with `root_id IS NULL`, but clone semantics and some client logic assume `root_id` might be non-null. citeturn8view2turn7view2
  - Decision for rewrite: do not assume root.root_id; always compute project scope as `COALESCE(root_id, id)` on the client. Risk: the clone RPC may reject certain parent cases; see migration plan for a safe, additive function fix if production confirms the mismatch.
- Relationships feature:
  - Observed: schema has a `task_relationships` table and RLS, but the code expects an RPC not present in schema.sql. citeturn6view0turn8view2
  - Decision for rewrite: implement relationships using direct table access (select/insert/delete) unless and until an official RPC exists in migrations; no guessing.

## Implementation blueprint actionable

New repo layout (proposed)
```text
planterplan-web/
  package.json
  vite.config.ts
  tsconfig.json
  src/
    app/
      router.tsx
      providers/
        AuthProvider.tsx
        QueryProvider.tsx
        ThemeProvider.tsx
      layouts/
        DashboardLayout.tsx
      errors/
        RouteErrorBoundary.tsx
    shared/
      supabase/
        client.ts
        types.generated.ts
        keys.ts
        postgrest.ts        # retries/timeouts/logging wrapper
      domain/
        invariants.ts       # position math, status/is_complete mapping
        tree.ts             # tree build and memo helpers
      ui/                   # Radix-based primitives
    features/
      auth/
        LoginPage.tsx
      projects/
        api.ts              # Project list/create/update via tasks + RPC initialize_default_project
        components/
      tasks/
        api.ts              # CRUD + clone_project_template + reorder
        components/
      memberships/
        api.ts              # invite_user_to_project + get_invite_details + member listing strategy
        components/
      people/
        api.ts
        components/
      resources/
        api.ts
        components/
    pages/
      Dashboard.tsx
      Project.tsx
      Team.tsx
      Reports.tsx
      Settings.tsx
  e2e/
    playwright.config.ts
    tests/
  .github/workflows/
    ci.yml
```

Phased build plan with milestones

Phase 0: scaffolding + CI + typegen + auth
- Work:
  - Create the new repo with TS, ESLint, Prettier, Tailwind, Radix primitives, TanStack Query provider, error boundary.
  - Add Supabase client wrapper and generated DB types.
  - Implement login/logout/session restore using Supabase Auth.
- Acceptance criteria:
  - CI runs: lint, typecheck, unit test placeholder, Playwright smoke.
  - User can log in and see a protected route shell.
- High-value tests:
  - E2E: login -> redirect to dashboard shell
  - Unit: auth provider state transitions (signed out -> signed in -> signed out)

Phase 1: read-only flows
- Work:
  - Dashboard read-only:
    - list owned projects: query `tasks` with `parent_task_id IS NULL` + `origin='instance'` (respect RLS)
    - list joined projects: query `project_members` join strategy based on schema (at minimum list project_ids and fetch those root tasks)
  - Project read-only:
    - fetch task tree: query tasks by `root_id = projectId` plus root task by id, build tree by parent_task_id, sort by position.
- Acceptance criteria:
  - User sees projects they created, can open a project, can view the full task tree in correct order.
- High-value tests:
  - E2E: login -> dashboard -> open project -> verify tasks render ordered by position
  - Integration: tree builder handles missing/NULL root_id by using COALESCE(root_id,id)

Phase 2: core write flows (CRUD tasks, completion toggle, editing)
- Work:
  - Create task under a parent:
    - compute next `position` (max sibling position + step)
    - set `root_id` to project scope id (computed from parent/root)
  - Edit task fields (title/desc/notes/purpose/actions/dates)
  - Toggle completion:
    - set `status='completed'` and `is_complete=true` (and reverse)
- Acceptance criteria:
  - Create/edit/complete actions persist and survive refetch.
  - Phase unlock behavior works (trigger-driven) when status changes to completed. citeturn7view1
- High-value tests:
  - E2E: create task -> edit -> toggle completion -> refresh -> state persists
  - Integration: completion write sets both fields consistently

Phase 3: drag/drop ordering + performance
- Work:
  - Implement reorder + reparent:
    - compute new position between neighbors
    - PATCH updates (batch) as the existing code intentionally avoids upsert to prevent RLS insert errors
  - Collision handling:
    - if new position cannot be computed, run a renormalize pass for the affected sibling set (client-side multi-patch), then retry move.
  - Performance:
    - virtualize non-dnd mode for large lists; keep dnd limited to non-virtual list or implement a virtualization-compatible dnd strategy.
- Acceptance criteria:
  - Reordering within a sibling list preserves stable ordering after reload.
  - Reparenting prevents cycles and maintains tree validity.
- High-value tests:
  - E2E: reorder tasks -> reload -> ordering preserved
  - Load test: 500 tasks render within acceptable time (baseline + regression guard)

Phase 4: invites/memberships + people/resources
- Work:
  - Invites:
    - invite by email via `invite_user_to_project`
    - accept invite link flow:
      - call `get_invite_details(token)` anonymously to render invite
      - after auth, call `invite_user_to_project` as the inviter is not available; instead, acceptance likely needs a dedicated acceptance RPC (NOT present in schema.sql) -> mark as unknown until schema verified
  - Membership list:
    - minimum viable: list `project_members` rows (user_id + role)
    - optional additive enhancement: introduce a SECURITY DEFINER RPC that returns safe member profile fields if required (only if verification says necessary)
  - People/resources:
    - people CRUD and task_resources CRUD as per schema.
- Acceptance criteria:
  - Owner/editor can invite; RLS prevents unauthorized member management.
  - People and resources screens work end-to-end.
- High-value tests:
  - E2E: invite member -> invited user can see project (requires end-to-end acceptance workflow verification)
  - RLS test: viewer cannot update tasks; owner can

## Test strategy

Split by level
- Unit tests (Vitest)
  - Pure functions: tree building, position math, status/is_complete mapping, date normalization.
- Integration tests (Vitest + real Supabase local, or a dedicated test project)
  - API adapters: ensure queries/mutations match schema columns and handle RLS errors cleanly.
  - RPC adapters: validate parameter names and returned JSON shapes for:
    - clone_project_template
    - invite_user_to_project
    - get_invite_details
    - initialize_default_project citeturn6view0turn7view0turn7view1
- E2E tests (Playwright)
  - Critical user journeys (required):
    - login
    - view template library (as implemented: templates where creator=user, unless confirmed otherwise)
    - create project from template (clone_project_template)
    - view task tree
    - edit task
    - toggle completion
    - reorder tasks
    - invite member
    - accept invite (blocked until acceptance contract verified; see migration/cutover plan)

RLS/permission test approach (policy regression)
- Strategy A (preferred): run Supabase locally, apply schema.sql, then execute tests as multiple real users:
  - user A creates a project
  - user A invites user B (RPC)
  - user B reads project tasks, attempts forbidden writes, is denied
- Strategy B: SQL-level policy tests by setting JWT claims in-session (requires careful setup); validate SELECT/INSERT/UPDATE/DELETE behavior against policies defined in schema.sql. citeturn8view2

## Migration and cutover plan no data loss

Parallel run strategy
- Deploy the rewrite as a separate frontend (new domain or subpath) pointing at the same Supabase project as the existing app.
- Phase rollout:
  - Stage 1: read-only mode in production (feature flag `READ_ONLY=true`) to validate queries, tree correctness, and RLS compatibility.
  - Stage 2: enable writes for a small allowlist (admin users) or a small cohort.
  - Stage 3: progressively enable write features (tasks CRUD -> completion -> reorder -> invites -> people/resources).
- Backward compatibility checks
  - The new app must not introduce data shapes that the old app cannot read. Because the schema is preserved, this is primarily about behavioral consistency:
    - ordering uses `position`
    - completion uses schema fields consistently
    - cloning uses the same RPC outputs citeturn6view0turn7view2

Rollback steps (no data rewrites)
- Rollback is routing-only:
  - Flip traffic back to the old frontend.
  - Because both frontends talk to the same schema and no destructive migrations are introduced, rollback does not require any database change.
- If an additive database change was introduced (optional RPC/view):
  - Rollback by dropping only the new additive object (function/view) after traffic rollback, keeping tables/data intact.

## Risk register

Top risks (severity, likelihood, mitigation, detection, rollback)

- Schema drift risk
  - Severity: High | Likelihood: Medium
  - Mitigation: generate and diff schema contracts in CI; require explicit sign-off for any additive migration.
  - Detection: CI contract diff fails.
  - Rollback: block deploy; no runtime impact.

- RLS misunderstanding risk
  - Severity: High | Likelihood: High
  - Mitigation: treat RLS as source-of-truth; implement RLS regression tests across roles; ensure membership writes use SECURITY DEFINER RPCs where intended. citeturn8view2turn7view0
  - Detection: integration tests asserting 401/403 behavior.
  - Rollback: feature-flag off writes; revert frontend.

- Ordering semantics risk (position collisions, inconsistent reorder)
  - Severity: High | Likelihood: Medium
  - Mitigation: implement deterministic renormalization fallback; constrain reorder to sibling scope; record analytics for collision frequency.
  - Detection: E2E reorder tests + runtime telemetry on move failures.
  - Rollback: disable drag/drop feature flag; keep manual editing.

- Drag/drop performance risk (large trees)
  - Severity: Medium | Likelihood: High
  - Mitigation: only enable virtualization in non-dnd mode; lazy-expand deeper levels; avoid rendering full 1000-node trees at once.
  - Detection: perf budgets in CI (Lighthouse/Playwright timings).
  - Rollback: force list-only mode, no board view.

- Auth/session edge cases (token refresh, multi-tab)
  - Severity: Medium | Likelihood: Medium
  - Mitigation: single auth provider, explicit session restore path, eliminate dual token sources where possible.
  - Detection: E2E with token expiry simulation.
  - Rollback: route users to old app if auth errors spike.

- RPC coupling risk (function bodies differ between schema.sql and prod)
  - Severity: High | Likelihood: Medium
  - Mitigation: verify production RPC definitions before relying on edge behaviors (notably clone parent root_id behavior); keep client defensive.
  - Detection: staging against prod with read-only flows; RPC contract tests.
  - Rollback: avoid behavior-dependent features until verified.

- Completion semantics risk (status vs is_complete drift)
  - Severity: Medium | Likelihood: High
  - Mitigation: enforce writes that set both fields; read-side normalizer; optional additive correction script after verification. citeturn7view1turn8view2
  - Detection: data quality dashboard (rows where status and is_complete disagree).
  - Rollback: revert to status-only display and stop writing is_complete until resolved.

- Invite acceptance workflow risk (missing acceptance RPC)
  - Severity: High | Likelihood: Medium
  - Mitigation: explicitly verify whether invite acceptance is implemented (schema.sql only shows invite creation + get_invite_details). If missing, add an additive acceptance RPC with rollback plan.
  - Detection: E2E invite acceptance fails.
  - Rollback: keep invites admin-managed only; hide acceptance UI.

- Dependencies/relationships feature risk (RPC missing)
  - Severity: Medium | Likelihood: High
  - Mitigation: implement direct-table relationship CRUD in rewrite; only use RPC if confirmed in migrations.
  - Detection: feature tests for relationships.
  - Rollback: hide relationships UI.

- Accidental introduction of destructive schema changes
  - Severity: Critical | Likelihood: Low
  - Mitigation: require that rewrite PRs cannot touch table drop/rename/type-change migrations; enforce "additive-only" review gates.
  - Detection: migration linter + schema diff tool.
  - Rollback: block deploy; no DB changes applied.

