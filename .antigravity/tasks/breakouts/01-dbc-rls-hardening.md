# .antigravity/tasks/breakouts/01-dbc-rls-hardening.md

**Status:** Pending **Priority:** HIGH

## 🎯 Objective

Establish an impenetrable, deterministic sandbox that prevents autonomous AI
agents from hallucinating invalid application states or bypassing strict tenant
boundaries during code generation.

## 🛠️ Execution Steps

### 1. Implement Design-by-Contract (DbC) with Zod

**Target:** `src/shared/types/` and domain API boundaries.

- Retroactively apply runtime validation across all critical boundary layers
  using `zod`.
- Convert static TypeScript interfaces into Zod schemas. Export both the schema
  and the inferred type (e.g.,
  `export type Task = z.infer<typeof TaskSchema>;`).
- Ensure schemas include mathematically enforced runtime invariants, such as
  ensuring a task's sub-items cannot circularly reference the parent task.

### 2. Optimize RLS Policies

**Target:** `docs/db/schema.sql`

- Locate all inline RLS policies currently utilizing `auth.uid()` combined with
  expensive subqueries against the `users` table.
- Refactor these policies to utilize JWT custom claims wrapped in a `SELECT`
  statement: `(SELECT (auth.jwt() ->> 'tenant_id')::uuid)`. This forces
  PostgreSQL to cache the execution result, improving query evaluation times
  from $\mathcal{O}(N)$ to $\mathcal{O}(1)$.

### 3. Harden RPC Functions

**Target:** `docs/db/schema.sql` and relevant functions in `supabase/functions/`

- Identify all `SECURITY DEFINER` PostgreSQL functions.
- Append `SET search_path = ''` to these functions to prevent search path
  manipulation attacks.
- Inject explicit permission verification (e.g., utilizing a
  `public.has_permission` helper) BEFORE any mutation logic executes to
  completely neutralize privilege escalation vectors.

### 4. Implement pgTAP Database Tests

**Target:** CI Pipeline / `src/tests/security/`

- Add automated pgTAP tests into the CI pipeline to continuously simulate
  cross-tenant access attempts.
- Assert that the `is_empty()` function returns true when an anonymous or
  unauthorized role attempts to access restricted tables.

## 🚦 Verification (Completion Promise)

The agent may only mark this task as complete when:

1. All database mutations explicitly pass Zod parsing pre- and post-flight.
2. `pgTAP` tests successfully execute and pass in the CI environment, verifying
   RLS isolation.
