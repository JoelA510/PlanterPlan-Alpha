## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 33 shipped to `main`:
- `/admin` shell + global search across users/projects/templates
- `/admin/users` table with role/last-login/overdue filters + user-detail drawer
- `/admin/analytics` with cards, time-series, and breakdown charts
- Admin notification on new project creation (via the Wave 30 dispatch pipeline) — closes the `dashboard-analytics.md` Admin Notifications gap

Spec is at **1.18.0**. Outstanding roadmap: §3.7 White Labeling (this wave), §3.7 Store + License Management (Wave 35), §3.7 External Integrations (Wave 36), Wave 37 architecture-doc gap closures, Wave 38 release readiness.

Wave 34 ships **White Labeling** (§3.7). This is multi-tenant infrastructure — partner organizations can use custom URLs, logos, colors, and have a delegated admin scope over their tenant's projects. The architectural impact is significant: every project gains an `organization_id`, RLS adds an organization-scoping layer, and the React app branches its branding at runtime based on the requesting hostname.

**Test baseline going into Wave 34:** Wave 33 shipped at ≥705 tests. Run `npm test` and record. Lint baseline: 0 errors, ≤7 warnings — do not regress.

**Read `.claude/wave-testing-strategy.md` before starting.** Wave 34 specific: any component that's updated to consume `useTenant()` directly must add `vi.mock('@/shared/contexts/TenantContext', () => ({ useTenant: () => mockUseTenant() }))` to its existing tests, otherwise the test throws on missing context. Extend `Testing/test-utils/render-with-providers.tsx` (created in Wave 31) with a `tenant?: Partial<OrganizationRow>` option. E2E: existing tests run against the default `planterplan` org and pass unchanged.

**Breaking-change pre-approval (logged here for the migration header to reference):** Wave 34's `tasks.organization_id` backfill is a one-shot data migration that touches every existing row. The user has pre-approved this in the planning session — log the approval source as "Wave 34 plan in `.claude/wave-34-prompt.md` — pre-approved by user during planning" in the migration's revert-path block.

## Pre-flight verification (run before any task)

1. `git log --oneline` includes the 3 Wave 33 commits + docs sweep.
2. These files exist:
   - `src/app/App.tsx` (provider tree — Wave 34 wraps `<TenantProvider>` between `<I18nextProvider>` (Wave 31) and `<AuthProvider>`)
   - `src/index.css` (Tailwind v4 inline `@theme` block — Wave 34 swaps brand tokens to CSS variables for runtime override)
   - `src/layouts/DashboardLayout.tsx` (logo + app name source)
   - `src/pages/components/LoginForm.tsx` (branded login)
   - `src/shared/contexts/AuthContext.tsx` (precedent for context shape; TenantContext mirrors)
   - `src/pages/admin/AdminLayout.tsx` (Wave 33 — Wave 34 adds Organizations link to the sidebar)
3. **Storage bucket creation policy** — Supabase storage buckets are NOT created via SQL migrations in this codebase. Use the Supabase CLI (`supabase storage create branding-assets --public`) OR the Supabase Studio (Storage → New bucket) instead. Document the bucket prerequisite in the Task 3 PR description and `docs/operations/`.
4. Brand color tokens currently live in `src/index.css` as fixed HSL values inside `@theme` (`--brand-50` through `--brand-900` per the Wave 23 codebase map). Wave 34 swaps `--brand-500`/`-600`/`-700` to runtime-overridable CSS variables (the rest stay fixed for v1).

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-34-organizations-schema`
- Task 2 → `claude/wave-34-tenant-routing`
- Task 3 → `claude/wave-34-branding-overrides`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 34 scope

Three tasks. Task 1 lays the data model + RLS scoping. Task 2 wires custom-domain hostname → organization resolution. Task 3 ships the branding overrides (logo, colors, name).

---

### Task 1 — Organizations table + project-scoping migration

**Commit:** `feat(wave-34): organizations table + organization_id on tasks + RLS scoping`

The schema impact ripples through the whole app. Take the migration carefully — backfill is one-shot.

1. **Migration** (`docs/db/migrations/2026_04_18_organizations.sql`, NEW)
   - `CREATE TABLE public.organizations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'), name text NOT NULL, primary_domain text UNIQUE, branding jsonb NOT NULL DEFAULT '{}'::jsonb, billing_email text, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`.
   - `branding` JSONB shape (documented inline): `{ logo_url, primary_color, accent_color, dark_logo_url?, favicon_url?, app_name? }`.
   - `CREATE TABLE public.organization_members (organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role text NOT NULL CHECK (role IN ('org_admin', 'member')), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (organization_id, user_id))`.
   - **Add `organization_id` to `public.tasks`**: `ALTER TABLE public.tasks ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL`.
     - Index: `CREATE INDEX idx_tasks_organization_id ON public.tasks (organization_id) WHERE organization_id IS NOT NULL`.
   - **Bootstrap default org** + **backfill**: `INSERT INTO public.organizations (slug, name) VALUES ('planterplan', 'PlanterPlan')`; `UPDATE public.tasks SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'planterplan') WHERE organization_id IS NULL`.
   - `INSERT INTO public.organization_members (organization_id, user_id, role) SELECT (SELECT id FROM public.organizations WHERE slug = 'planterplan'), id, 'member' FROM auth.users`.
   - **Trigger** to auto-fill `organization_id` on new tasks: `CREATE FUNCTION public.set_task_organization_id()` BEFORE INSERT, looks up the creator's primary org membership and fills NEW.organization_id; falls back to the default `planterplan` org if no other membership exists.
   - **RLS on `organizations`**: SELECT for any active member via `EXISTS (SELECT 1 FROM organization_members WHERE organization_id = id AND user_id = auth.uid()) OR is_admin(auth.uid())`. INSERT/UPDATE/DELETE for `org_admin` only OR `is_admin`.
   - **RLS on `organization_members`**: SELECT for any member of the org. INSERT/DELETE for `org_admin` only.
   - **Update existing `tasks` policies** to **also** require `organization_id` matches the auth user's org memberships (additive WITH-clause; existing membership-based gates stay):
     - SELECT: `(is_active_member(...) OR is_admin(...)) AND (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()) OR is_admin(...))`.
     - Same wrap for INSERT/UPDATE/DELETE — admins can cross-org, members cannot.
   - Mirror everything into `docs/db/schema.sql`.

2. **Seed data convention** (`docs/db/seed_organizations.sql`, NEW — for local dev only)
   - Create one extra org (`'crossway-network'`) for testing the multi-tenant flow without modifying the default.

3. **Architecture doc** (`docs/architecture/organizations.md`, NEW)
   - Sections: Multi-tenancy model (single DB, organization_id scoping); Schema (organizations + organization_members + tasks.organization_id); RLS pattern (additive wrap on every existing tasks policy); Default org bootstrap + backfill semantics; Branding JSONB shape; Tenant resolution (Task 2 fills this); Org admin role (Task 3).

4. **Domain types + planterClient** (`src/shared/db/app.types.ts`, `src/shared/api/planterClient.ts`)
   - Add `OrganizationRow`, `OrganizationMemberRow`, `OrganizationBranding` (typed JSONB shape).
   - Add `entities.Organization.{ list, get, getBySlug, getByDomain, update }` namespace.
   - Hand-add the new tables + column to `database.types.ts`.

5. **Tests**
   - `Testing/unit/shared/api/planterClient.organizations.test.ts` (NEW) — query shapes.
   - Manual `psql` smoke at `docs/db/tests/organization_rls.sql` — exercise: a user in org A cannot SELECT a task with `organization_id = orgB.id` (returns 0 rows); admin can SELECT both.

**DB migration?** Yes — additive plus a backfill UPDATE. The user has pre-approved this breaking change in this wave plan; document the explicit approval in the migration header so future readers don't think it slipped through.

**Out of scope:** Data migration tooling for moving projects between orgs (deferred). Per-org admins (Task 3 surfaces the role; the `org_admin` differs from global `admin_users` and that distinction is documented). Custom RLS policies per org (deferred — the global RLS is org-scoped; per-org overrides would require a much heavier policy generator).

---

### Task 2 — Tenant routing (custom domain → organization)

**Commit:** `feat(wave-34): hostname-based tenant resolution + tenant context provider`

1. **Tenant resolver** (`src/shared/contexts/TenantContext.tsx`, NEW)
   - `<TenantProvider>` wraps the app (under `<AuthProvider>` so auth knows which org's branding to render at the login page too).
   - On mount: read `window.location.hostname` → if it matches an `organizations.primary_domain`, set `currentOrg = that org`; else set `currentOrg = default 'planterplan' org`.
   - Exposes `useTenant()` returning `{ org: OrganizationRow, isDefaultTenant: boolean, refetch: () => void }`.
   - **Caches** the org in `localStorage` keyed by hostname so subsequent loads don't block on a network round-trip; refetch on hard refresh + on `Tab` focus regain (TanStack-Query-friendly stale handling).

2. **Migration: domain handling** — already covered by `organizations.primary_domain` column from Task 1. Verify it's UNIQUE.

3. **Edge function for domain resolution** (`supabase/functions/resolve-tenant/`, NEW: `index.ts` + `README.md`)
   - Public (unauthenticated) endpoint `GET /resolve-tenant?domain=:hostname` → returns `{ id, slug, name, branding }` for the matching org, or the default org.
   - Cache for 5 minutes per domain in the function's memory (no shared cache — instance-local; Supabase Edge Functions have very short cold starts so this is fine).
   - Also accepts `?slug=:slug` as an alternative lookup path (used by the dev environment when running on `localhost:5173?org=:slug`).

4. **Local dev support** (`vite.config.ts`)
   - Document a `?org=:slug` query param in `vite.config.ts` comments so local dev can simulate tenants without DNS setup.
   - `TenantProvider` checks for the query param first when running on localhost.

5. **Vercel rewrites or middleware** (depending on deployment) — out of immediate scope (the React app does its own resolution). Document the Vercel/Cloudflare DNS setup needed to map a custom domain to the existing PlanterPlan deployment in `docs/operations/custom-domain-setup.md`, NEW.

6. **Update the default Auth flow** (`src/pages/components/LoginForm.tsx` or equivalent)
   - Branding renders BEFORE auth — the user sees the right logo/colors at the login page based on the hostname's tenant.

7. **Tests**
   - `Testing/unit/shared/contexts/TenantContext.test.tsx` (NEW) — hostname → org resolution; default fallback; localhost `?org=` override.
   - `Testing/unit/supabase/functions/resolve-tenant.test.ts` (NEW) — exact match, miss → default, slug fallback.

**DB migration?** No — Task 1 owns the schema.

**Out of scope:** SSL cert provisioning automation (Vercel handles automatically per custom domain). DNS validation API — defer. Custom subdomain auto-provisioning (e.g., `acme.planterplan.app`) — defer.

---

### Task 3 — Branding overrides + org admin UI

**Commit:** `feat(wave-34): branding (logo, colors, app name) + /admin/organizations CRUD`

1. **Tailwind theme via CSS variables** (`src/index.css`)
   - There is **no `tailwind.config.ts`** in this repo (Tailwind v4 inline `@theme` block in `src/index.css`). Make the swap inside the `@theme` directive.
   - Convert ONLY `--brand-500`, `--brand-600`, `--brand-700` to runtime-overridable CSS variables. Other brand steps (50/100/.../800/900) stay fixed for v1 — keeps the override surface narrow.
   - Use **HSL triplets** to match the existing convention in `src/index.css` (every other color in the file is HSL): `--brand-500: 14 95% 55%; --brand-600: 24 95% 53%; --brand-700: 28 92% 47%;` (these are placeholder defaults — confirm against the current `src/index.css` values; do not change visual defaults). Then: `--color-brand-500: hsl(var(--brand-500));` style references in the `@theme` block.
   - **Tenant override**: `<TenantProvider>` injects a `<style id="tenant-brand">` block at mount setting `--brand-500`/`-600`/`-700` from `currentOrg.branding.primary_color` (the org stores ONE primary color; we derive the 500/600/700 ramp via a small lightness-shift helper). Default to the existing values when `branding.primary_color === null`.
   - **Avoid FOUC**: inject the `<style>` block in a synchronous `useLayoutEffect` (NOT `useEffect`) so the first paint already has the right colors. Resolve the org from cached localStorage first; refetch on mount.

2. **Logo override** (`src/layouts/DashboardLayout.tsx`, `LoginForm.tsx`)
   - Replace hardcoded `<img src="/logo.svg">` with `<img src={tenant.branding.logo_url ?? '/logo.svg'}>`.
   - App name in the document title and header: `tenant.branding.app_name ?? 'PlanterPlan'`.
   - Favicon: dynamically inject `<link rel="icon" href={tenant.branding.favicon_url ?? '/favicon.ico'}>` from `TenantProvider`.

3. **Admin UI** (`src/pages/admin/AdminOrganizations.tsx`, NEW + linked from `AdminLayout` sidebar)
   - List orgs (admin only — `is_admin`). Each row: logo thumbnail, name, slug, primary domain, member count.
   - Click → org detail page (`AdminOrganizationDetail.tsx`):
     - Edit name, slug, primary domain.
     - Edit branding: color pickers (Shadcn-friendly `<input type="color">` + hex input), logo URL upload (use Supabase Storage bucket `branding-assets` — create the bucket in Task 1's migration as `INSERT INTO storage.buckets ...`), app name.
     - Member list + role management (add `org_admin` / remove member).
   - "Create organization" button on the list page.

4. **Org-admin role gating** (`docs/db/migrations/2026_04_18_organizations.sql` extension)
   - Already covered in Task 1's RLS — `org_admin` can UPDATE its own organization row + invite/remove members. Verify in the smoke test below.
   - **Org-admin is distinct from global `is_admin`** — they have full UPDATE on their org but no cross-org access. Document this clearly in `organizations.md`.

5. **Architecture doc** (`docs/architecture/organizations.md`)
   - Fill in Branding section + Org Admin section.

6. **Tests**
   - `Testing/unit/pages/admin/AdminOrganizations.test.tsx` (NEW)
   - `Testing/unit/pages/admin/AdminOrganizationDetail.test.tsx` (NEW) — branding form save; member add/remove.
   - `Testing/unit/shared/contexts/TenantContext.branding.test.tsx` (NEW) — branding overrides apply CSS variables; defaults when `null`.

**DB migration?** No new SQL migration in Task 3. The `branding-assets` storage bucket is created via **Supabase CLI** (preferred) or Supabase Studio:

```bash
# Run once, in the Supabase project. Does NOT live in a SQL migration file.
supabase storage create branding-assets --public
```

Document this prerequisite in the Task 3 PR description AND in `docs/operations/deployment.md` (Wave 38) so a fresh deployment knows to create the bucket. If `docs/operations/deployment.md` doesn't exist yet, add the bucket-creation note to `docs/operations/custom-domain-setup.md` (Task 2) instead.

**Out of scope:** Per-org email-sender configuration (Wave 35 territory — touches Resend per-org). Per-org login methods (deferred — single OAuth/email setup for now). Custom domain SSL/DNS automation. Org-level RLS overrides for tasks (deferred — the additive wrap from Task 1 is the contract for v1).

---

## Documentation Currency Pass (mandatory — before review)

1. **`spec.md`** — flip §3.7 White Labeling from `[ ]` to `[x]` with sub-bullets per task. Bump version to **1.19.0**. Update `Last Updated`.
2. **`docs/AGENT_CONTEXT.md`** — add "Multi-tenancy (Wave 34)" golden-path bullet pointing to `organizations.md` + `TenantContext`.
3. **`docs/architecture/organizations.md`** is in (filled across all three tasks).
4. **`docs/architecture/auth-rbac.md`** — append "Org-Admin Role (Wave 34)" sub-section: distinguishes from global `is_admin`; lists the additive RLS wrap on `tasks`.
5. **`docs/operations/custom-domain-setup.md`** is in (Task 2).
6. **`docs/dev-notes.md`** — confirm currency. Add an entry: "**Active:** Tenant resolution caches in localStorage per hostname for 5min + tab-focus refetch. Cache-invalidation deferred to Wave 38 if needed."
7. **`repo-context.yaml`** — bump `wave_status.current` to `Wave 34 (White Labeling)`, update `last_completed`, `spec_version`, add `wave_34_highlights:` block. Update the data_models section to include `organizations` and `organization_members`.
8. **`CLAUDE.md`** — add `organizations`, `organization_members` to Tables. New "Multi-tenancy" subsection: tenant resolution flow; org-admin vs. global admin distinction; branding override contract. Add `branding-assets` storage bucket to the env section.

Land docs as `docs(wave-34): documentation currency sweep`.

## Wave Review (mandatory — before commit + push to main)

1. **Backfill correctness** — `SELECT COUNT(*) FROM public.tasks WHERE organization_id IS NULL` should return 0 after migration.
2. **RLS enforcement** — create a project as user A in org X. As user B (in org Y, not in X) → cannot SELECT or UPDATE A's project. As global admin → can SELECT all.
3. **Tenant resolution** — start the dev server with `?org=crossway-network` → header logo + colors swap to crossway-network's branding. Default tenant on bare URL → PlanterPlan branding.
4. **Branding edit flow** — global admin opens `/admin/organizations/:slug` → changes primary color → reload → color applied. CSS-variable swap should happen at mount; no flash of unstyled content.
5. **Org-admin scope** — sign in as an `org_admin` (not global admin) → can edit own org branding; cannot see other orgs' admin pages.
6. **Bootstrap trigger** — sign up a brand-new user → confirm they're added as `member` to the default org via the existing trigger logic (or a new trigger if added in Task 1).
7. **No FSD drift** — `TenantContext` lives in `shared/contexts/` (cross-cutting, no domain-specific business logic).
8. **Type drift** — `database.types.ts` hand-edited cleanly with new tables + column.
9. **Test-impact reconciled** — every component updated to consume `useTenant()` has its existing test extended with `vi.mock('@/shared/contexts/TenantContext', ...)`; `renderWithProviders` (Wave 31) extended with optional `tenant?` parameter; `Testing/test-utils/mocks/tenant.ts` (NEW) provides `mockUseTenant()`; no `it.skip`. Test count ≥ baseline + new tests.
10. **Lint + build + tests** — green per `.claude/wave-execution-protocol.md` §4 (HALT on any failure). The one-shot backfill is a §8.1 protocol concern — if it fails to apply, HALT.

## Commit & Push to Main (mandatory — gates Wave 35)

After all three Tasks merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npx vitest run`.
2. The history should show: 3 task commits + 1 docs sweep commit on top of Wave 33.
3. Push to `origin/main`. CI green.
4. **Do not start Wave 35** until the above is true.

## Verification Gate (per task, before push)

**Every command below is a HALT condition per `.claude/wave-execution-protocol.md` §4. Wave 34's `tasks.organization_id` backfill is a one-shot data migration (§8.1) — if the migration fails to apply cleanly, HALT and surface; do NOT manually run partial steps.**

```bash
npm run lint      # 0 errors required (≤7 pre-existing warnings tolerated). FAIL → HALT.
npm run build     # clean (tsc -b && vite build). FAIL → HALT.
npm test          # 100% pass rate; count ≥ baseline + new tests. FAIL → HALT.
git status        # clean
```

Manual smoke per Wave Review section.

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/auth-rbac.md` — `is_admin(auth.uid())` is the only **global** admin gate; this wave introduces an `org_admin` role that is per-org
- `docs/architecture/notifications.md` — Wave 30 `notification_log` is unaffected (logs cross-org by design — admin-broadcast feature)
- `src/shared/contexts/AuthContext.tsx` — auth context pattern; TenantContext mirrors the same shape
- `src/index.css` — Tailwind v4 token setup; CSS-variable swap target

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror Task 1's massive migration)
- `docs/architecture/organizations.md` (filled across all three tasks)
- `docs/architecture/auth-rbac.md` (Org-Admin sub-section)
- `docs/AGENT_CONTEXT.md` (Wave 34 golden path)
- `docs/dev-notes.md` (TenantContext caching note)
- `docs/operations/custom-domain-setup.md` (NEW operational doc)
- `src/shared/db/database.types.ts` (organizations + organization_members + tasks.organization_id)
- `src/shared/db/app.types.ts` (OrganizationRow + OrganizationBranding + OrganizationMemberRow)
- `src/shared/api/planterClient.ts` (`entities.Organization`)
- `src/index.css` (CSS-variable swap)
- `tailwind.config.ts` (or equivalent — reference CSS variables)
- `src/main.tsx` (or providers.tsx) — wrap in `<TenantProvider>` between Auth and other providers
- `src/layouts/DashboardLayout.tsx` (logo, app name, favicon from tenant)
- `src/pages/components/LoginForm.tsx` (branded login)
- `src/app/App.tsx` — add `/admin/organizations/*` routes
- `vite.config.ts` (document `?org=` localhost override)
- `spec.md` (flip §3.7 White Labeling to `[x]`, bump to 1.19.0)
- `repo-context.yaml` (Wave 34 highlights + data_models update)
- `CLAUDE.md` (Tables + Multi-tenancy subsection)

**Will create:**
- `docs/db/migrations/2026_04_18_organizations.sql`
- `docs/db/seed_organizations.sql`
- `docs/db/tests/organization_rls.sql`
- `docs/architecture/organizations.md`
- `docs/operations/custom-domain-setup.md`
- `src/shared/contexts/TenantContext.tsx`
- `src/pages/admin/AdminOrganizations.tsx`
- `src/pages/admin/AdminOrganizationDetail.tsx`
- `supabase/functions/resolve-tenant/index.ts`
- `supabase/functions/resolve-tenant/README.md`
- `Testing/unit/shared/contexts/TenantContext.test.tsx`
- `Testing/unit/shared/contexts/TenantContext.branding.test.tsx`
- `Testing/unit/shared/api/planterClient.organizations.test.ts`
- `Testing/unit/pages/admin/AdminOrganizations.test.tsx`
- `Testing/unit/pages/admin/AdminOrganizationDetail.test.tsx`
- `Testing/unit/supabase/functions/resolve-tenant.test.ts`

**Explicitly out of scope this wave:**
- SSL / DNS automation
- Per-org email sender (Wave 35 territory)
- Per-org login methods
- Org-level RLS overrides for tasks
- Bulk migration tools for moving projects between orgs
- Org-level billing isolation (Wave 35 territory)

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files (import directly from concrete paths); path alias `@/` → `src/`; no raw date math; no direct `supabase.from()` in components; Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); CSS variables for tokens only — never inline hex in JSX (the branding swap depends on this); optimistic mutations must force-refetch on error; max subtask depth = 1; template vs instance clarified on any cross-cutting work; only add dependencies if truly necessary (Wave 34 should add **zero** new npm deps); atomic revertable commits; build + lint + tests all clean before every push; **DB migrations are additive-only — except** the `tasks.organization_id` backfill which is a one-shot data migration explicitly approved in this wave plan; the migration header MUST document the approval source.
