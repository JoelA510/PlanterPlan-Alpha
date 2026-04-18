## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 34 shipped to `main`:
- `organizations` + `organization_members` tables; `tasks.organization_id` backfilled to default `planterplan` org
- RLS additive wrap: every task gate now also checks org membership; admins cross-org
- `TenantContext` resolves hostname → org; branding (logo, colors, app name) overrides at runtime
- `/admin/organizations` CRUD; org-admin role distinct from global admin

Spec is at **1.19.0**. Outstanding roadmap: §3.7 Store + Monetization (this wave), §3.7 User License Management (this wave — pairs naturally with Stripe), §3.7 External Integrations (Wave 36), Wave 37 architecture-doc gap closures, Wave 38 release readiness.

Wave 35 ships **Stripe-backed monetization + license enforcement** (§3.7). Two related items combined into one wave because they share the same Stripe webhook surface and pricing-tier model. Closes the `auth-rbac.md` "Licensing Enforcement" known-gap.

**Gate baseline going into Wave 35:** confirm the current `main` baseline. Run `npm run lint`, `npm run build`, `npx vitest run`. **Stripe test-mode keys** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) must be available in your local Supabase environment for end-to-end smoke testing — without them the wave's edge functions degrade to log-only (mirrors the Wave 22 Resend pattern).

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-35-stripe-checkout`
- Task 2 → `claude/wave-35-license-enforcement`
- Task 3 → `claude/wave-35-discount-codes`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`.

## Wave 35 scope

Three tasks. Task 1 wires Stripe Checkout + customer portal + webhook. Task 2 enforces license limits at the project-creation gate (RLS + UI). Task 3 ships discount codes (a small, contained feature that pairs naturally with the rest).

---

### Task 1 — Stripe Checkout + customer portal + webhook

**Commit:** `feat(wave-35): stripe checkout, customer portal, subscription webhook`

1. **Stripe primitives configured externally** — three subscription plans defined in the Stripe dashboard: `Free` ($0/mo, 1 project, 5 members), `Pro` ($19/mo, 10 projects, 25 members), `Network` ($99/mo, unlimited). Document the price IDs in `.env.example` as `STRIPE_PRICE_FREE`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_NETWORK`. **Real price IDs go in env, not committed.**

2. **Migration** (`docs/db/migrations/2026_XX_XX_subscriptions.sql`, NEW)
   - `CREATE TABLE public.subscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE, stripe_customer_id text UNIQUE, stripe_subscription_id text UNIQUE, plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','network')), status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','past_due','canceled','incomplete')), current_period_end timestamptz, trial_ends_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`.
   - `CREATE TABLE public.subscription_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, stripe_event_id text NOT NULL UNIQUE, event_type text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb, processed_at timestamptz, error text, received_at timestamptz NOT NULL DEFAULT now())`. Append-only audit of every webhook event for debugging.
   - `idx_subscriptions_user_id` on `(user_id)`; `idx_subscription_events_user_id` on `(user_id, received_at DESC)`.
   - **Bootstrap**: `INSERT INTO public.subscriptions (user_id, plan) SELECT id, 'free' FROM auth.users ON CONFLICT (user_id) DO NOTHING`. Trigger `trg_bootstrap_subscription AFTER INSERT ON auth.users` mirrors the Wave 30 notification-prefs bootstrap pattern.
   - **RLS**:
     - `subscriptions`: SELECT `user_id = auth.uid() OR is_admin(auth.uid())`. INSERT/UPDATE/DELETE via SECURITY DEFINER edge function only.
     - `subscription_events`: SELECT `is_admin(auth.uid())`. INSERT/UPDATE via webhook function only.
   - Mirror everything into `docs/db/schema.sql`.

3. **Stripe Checkout edge function** (`supabase/functions/stripe-checkout/`, NEW: `index.ts` + `README.md`)
   - POST `/stripe-checkout` with `{ price_id }`. Authenticated.
   - Creates a Stripe customer (if not existing) → stamps `stripe_customer_id` on the user's `subscriptions` row.
   - Creates a Checkout Session with `mode: 'subscription'`, `line_items: [{ price: price_id, quantity: 1 }]`, `success_url: ${APP_URL}/settings/billing?success=true`, `cancel_url: ${APP_URL}/settings/billing?canceled=true`.
   - Returns `{ checkout_url }`. UI redirects.

4. **Stripe customer portal edge function** (`supabase/functions/stripe-portal/`, NEW: `index.ts` + `README.md`)
   - POST `/stripe-portal`. Authenticated. Returns `{ portal_url }` for the user's `stripe_customer_id`.
   - Used for managing the existing subscription (upgrade, downgrade, cancel, payment method).

5. **Stripe webhook edge function** (`supabase/functions/stripe-webhook/`, NEW: `index.ts` + `README.md`)
   - POST `/stripe-webhook`. Public (unauthenticated) — Stripe sends signed events.
   - Verifies `Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET`. Reject 401 on signature failure.
   - Idempotency: insert into `subscription_events` with `stripe_event_id` UNIQUE — duplicate events are silently dropped (return 200 OK so Stripe doesn't retry).
   - Handles:
     - `customer.subscription.created` / `.updated` → upsert `subscriptions` row with new `plan`/`status`/`current_period_end`.
     - `customer.subscription.deleted` → set `plan = 'free', status = 'canceled', stripe_subscription_id = NULL`.
     - `invoice.payment_failed` → set `status = 'past_due'`.
     - `checkout.session.completed` → side-effect of `customer.subscription.created`; usually a no-op.
   - Updates `subscription_events.processed_at` on success or `error` on failure.
   - README documents the event-type matrix and the idempotency contract.

6. **planterClient methods** (`src/shared/api/planterClient.ts`)
   - `billing.getSubscription()`, `billing.startCheckout(priceId)`, `billing.openPortal()`.

7. **Settings → Billing tab** (`src/pages/Settings.tsx`)
   - New tab "Billing" between Notifications and Security.
   - Shows current plan, status, next billing date, "Upgrade" buttons (Free → Pro → Network) that call `billing.startCheckout(priceId)`, "Manage subscription" button that calls `billing.openPortal()`.
   - Handles `?success=true` / `?canceled=true` URL params with toasts.

8. **Architecture doc** (`docs/architecture/billing.md`, NEW)
   - Sections: Stack (Stripe Checkout + Portal + Webhook); Plans + price IDs; Subscription lifecycle (free → pro → network → cancel → free); Webhook idempotency contract; Failure modes (past_due, incomplete); Audit trail in `subscription_events`.

9. **Tests**
   - `Testing/unit/shared/api/planterClient.billing.test.ts` (NEW) — query shape for the three billing methods.
   - `Testing/unit/supabase/functions/stripe-webhook.test.ts` (NEW) — signature verification; idempotency on duplicate event; subscription.updated upsert; subscription.deleted demotion; invoice.payment_failed status flip.
   - `Testing/unit/pages/Settings.billing.test.tsx` (NEW) — tab renders, plan list, checkout button calls function, success/canceled toast.

**DB migration?** Yes — two tables + bootstrap trigger.

**Out of scope:** Annual vs monthly pricing toggle (deferred — single-cadence per plan for v1). Multiple seats / team billing (deferred — Wave 34's org model would need to grow a billing-aware role; a follow-up wave). Tax handling beyond Stripe Tax defaults (deferred). Currency switching (Stripe handles per-customer; UI is USD-only for v1).

---

### Task 2 — License enforcement (project creation gate)

**Commit:** `feat(wave-35): enforce subscription plan limits on project creation`

1. **Plan-limit constants** (`src/shared/constants/billing.ts`, NEW)
   - `PLAN_LIMITS = { free: { projects: 1, members: 5 }, pro: { projects: 10, members: 25 }, network: { projects: Infinity, members: Infinity } } as const`.
   - Also export per-plan display names + monthly price for the UI.

2. **DB-side enforcement** (`docs/db/migrations/2026_XX_XX_license_enforcement.sql`, NEW)
   - **Pre-INSERT trigger on `tasks`** (when `parent_task_id IS NULL AND origin = 'instance'` — i.e., creating a new project root):
     - Look up the user's `subscriptions.plan`.
     - Count their existing project roots (`SELECT COUNT(*) FROM public.tasks WHERE parent_task_id IS NULL AND origin = 'instance' AND creator = NEW.creator`).
     - If count >= plan's `projects` limit, `RAISE EXCEPTION 'license_limit_exceeded'`.
     - Skip the check entirely when `is_admin(NEW.creator)` (admins bypass; useful for testing + customer support).
   - **Pre-INSERT trigger on `project_members`**:
     - Look up the project owner's `subscriptions.plan`.
     - Count existing members on the project.
     - If count >= plan's `members` limit, `RAISE EXCEPTION 'member_limit_exceeded'`.
     - Skip when `is_admin(auth.uid())`.
   - Mirror everything into `docs/db/schema.sql`.

3. **App-side surfacing** (`src/features/projects/components/NewProjectForm.tsx`, `src/features/projects/components/InviteMemberModal.tsx`)
   - On create-project / invite-member: catch the `license_limit_exceeded` / `member_limit_exceeded` PostgrestError and translate into a Sonner toast: "You've reached your plan's project limit. Upgrade to add more." with a "Manage billing" CTA that opens the Stripe portal.
   - Pre-emptive UI gate: when the user is at their limit, the "Create project" / "Invite member" button shows as disabled with a tooltip + same CTA. Reads via `useSubscription()` + a count from the local React Query cache.

4. **Hook** (`src/features/settings/hooks/useSubscription.ts`, NEW)
   - `useSubscription()` → `useQuery({ queryKey: ['subscription'] })`.
   - Returns `{ subscription, planLimits, isAtProjectLimit(currentCount), isAtMemberLimit(currentMemberCount) }`.

5. **Architecture doc** (`docs/architecture/auth-rbac.md`)
   - Flip "Licensing Enforcement" known-gap from TODO to **Resolved (Wave 35)**. Reference the new triggers + the app-side gate.

6. **Tests**
   - `Testing/unit/shared/constants/billing.test.ts` (NEW) — sanity check on the constant shape.
   - `Testing/unit/features/settings/hooks/useSubscription.test.tsx` (NEW) — limit predicates.
   - `Testing/unit/features/projects/components/NewProjectForm.licenseGate.test.tsx` (NEW) — disabled state at limit; toast on raised exception.
   - Manual `psql` smoke at `docs/db/tests/license_enforcement.sql` — Free user creates 1 project (OK); attempts 2nd → exception. Pro user creates 10 (OK); attempts 11th → exception. Admin bypasses.

**DB migration?** Yes — two pre-INSERT triggers.

**Out of scope:** Soft-limit grace period (one project over limit allowed, with a banner) — deferred. Tier downgrades that strand existing projects beyond limit (deferred — they remain accessible but new ones blocked; matches Stripe-standard SaaS behavior).

---

### Task 3 — Discount codes

**Commit:** `feat(wave-35): admin-managed discount codes for Stripe checkout`

1. **Migration** (`docs/db/migrations/2026_XX_XX_discount_codes.sql`, NEW)
   - `CREATE TABLE public.discount_codes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, stripe_promotion_id text UNIQUE, label text, max_redemptions int, redemptions int NOT NULL DEFAULT 0, expires_at timestamptz, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz)`.
   - `CHECK (max_redemptions IS NULL OR redemptions <= max_redemptions)`.
   - RLS: SELECT for any authenticated user (so the checkout form can validate). INSERT/UPDATE/DELETE for `is_admin` only.
   - Mirror into `docs/db/schema.sql`.

2. **Stripe-side mirror** — admin creates the promotion code in the Stripe dashboard first → records the resulting `promotion_id` in `discount_codes.stripe_promotion_id`. The app passes `discounts: [{ promotion_code: stripe_promotion_id }]` to the Checkout Session create call.

3. **planterClient methods** (`src/shared/api/planterClient.ts`)
   - `billing.validateDiscountCode(code: string)` — server-side `SELECT` + check expires_at + check max_redemptions. Returns `{ valid: boolean, label?: string, reason?: string }`.
   - `billing.startCheckout({ priceId, discountCode? })` — extends Task 1's method to forward the validated `stripe_promotion_id` to the edge function.

4. **Admin UI** (`src/pages/admin/AdminDiscountCodes.tsx`, NEW + linked from `AdminLayout` sidebar)
   - List discount codes (admin only). Each row: code, label, redemptions / max_redemptions, expires_at, status (active / expired / revoked).
   - "Create discount code" form: enter code (must already exist in Stripe) + label + max_redemptions + expires_at. On save, look up the Stripe promotion and stash `stripe_promotion_id`.
   - Revoke button: sets `revoked_at = now()`. Subsequent checkouts using the code raise.

5. **Settings → Billing UI** (`src/pages/Settings.tsx`)
   - When upgrading, optional "Have a discount code?" expandable input. On entry, calls `billing.validateDiscountCode(code)` → on valid, shows label + applies on next "Upgrade" click. On invalid, shows reason inline.

6. **Tests**
   - `Testing/unit/shared/api/planterClient.discountCodes.test.ts` (NEW)
   - `Testing/unit/pages/admin/AdminDiscountCodes.test.tsx` (NEW)
   - Manual `psql` smoke at `docs/db/tests/discount_codes_redemption.sql` — exhaustion behavior + expires_at + revoked_at gating.

**DB migration?** Yes — one table + RLS.

**Out of scope:** Self-serve discount-code creation (admin-only for v1; partner-portal scope for a much later wave). Auto-expiring codes via cron (the `expires_at` is checked on validation; no scheduled cleanup needed). Per-org discount codes (deferred — codes are global for v1).

---

## Documentation Currency Pass (mandatory — before review)

1. **`spec.md`** — flip §3.7 Store & Monetization from `[ ]` to `[x]` and §3.7 User License Management from `[ ]` to `[x]`. Sub-bullets: "Stripe Checkout + Portal + Webhook (Wave 35)", "Plan limits enforced at DB layer + UI gate (Wave 35)", "Discount codes via Stripe promotion mapping (Wave 35)". Bump version to **1.20.0**. Update `Last Updated`.
2. **`docs/AGENT_CONTEXT.md`** — add "Billing & Licensing (Wave 35)" golden-path bullet.
3. **`docs/architecture/billing.md`** is in (Task 1).
4. **`docs/architecture/auth-rbac.md`** — Licensing Enforcement gap → Resolved.
5. **`docs/dev-notes.md`** — confirm currency. Add: "**Active:** Discount codes require manual Stripe promotion creation first; the in-app form requires the Stripe promotion id. Self-serve creation deferred."
6. **`repo-context.yaml`** — bump `wave_status.current` to `Wave 35 (Monetization + Licensing)`, update `last_completed`, `spec_version`, add `wave_35_highlights:` block.
7. **`CLAUDE.md`** — add `subscriptions`, `subscription_events`, `discount_codes` to Tables. New "Billing" subsection: Stripe env vars, plan tiers, license enforcement triggers, edge function inventory.
8. **`.env.example`** — add `STRIPE_SECRET_KEY=`, `STRIPE_WEBHOOK_SECRET=`, `STRIPE_PRICE_FREE=`, `STRIPE_PRICE_PRO=`, `STRIPE_PRICE_NETWORK=`.

Land docs as `docs(wave-35): documentation currency sweep`.

## Wave Review (mandatory — before commit + push to main)

1. **End-to-end checkout** — sign in as a fresh user (Free plan auto-bootstrapped) → Settings → Billing → click "Upgrade to Pro" → redirected to Stripe Checkout (test mode) → enter test card `4242 4242 4242 4242` → success → redirected back with `?success=true` → `subscriptions` row updated to `pro` after webhook fires (~1s).
2. **Subscription cancellation** — open Stripe Customer Portal → cancel → webhook fires → `plan = 'free'` after `current_period_end`.
3. **License limit enforced** — Free user creates 1 project (OK) → attempts 2nd → toast "Upgrade to add more". Click CTA → portal opens.
4. **Discount code** — admin creates a code in Stripe + records in app → user enters at checkout → Stripe applies discount → subscription created with discount applied.
5. **Webhook idempotency** — manually re-POST the same Stripe event → no duplicate row, no exception, returns 200 OK.
6. **Webhook signature** — POST a forged event with bad signature → 401.
7. **No FSD drift** — `useSubscription` lives in `features/settings/hooks/`; constants in `shared/constants/`; admin pages in `pages/admin/`.
8. **Type drift** — three new tables hand-edited cleanly.
9. **Lint + build + tests** — green.

## Commit & Push to Main (mandatory — gates Wave 36)

After all three Tasks merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npx vitest run`.
2. The history should show: 3 task commits + 1 docs sweep commit on top of Wave 34.
3. Push to `origin/main`. CI green.
4. **Do not start Wave 36** until the above is true.

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors (warnings baseline ≤7, do not regress)
npm run build     # clean (tsc -b && vite build)
npx vitest run    # baseline + new tests
git status        # clean
```

Manual smoke per Wave Review.

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/auth-rbac.md` — Licensing Enforcement gap closes here
- `docs/architecture/notifications.md` — Wave 30 dispatch pattern is the precedent for Stripe webhook (signed POST, idempotent)
- Stripe Checkout / Customer Portal / Webhook signature docs — read all three before implementing Task 1
- `supabase/functions/supervisor-report/` — precedent for edge function with secret-gated dispatch + log fallback

## Critical Files

**Will edit:**
- `docs/db/schema.sql` (mirror three new migrations)
- `docs/architecture/auth-rbac.md` (Licensing Enforcement → Resolved)
- `docs/AGENT_CONTEXT.md` (Wave 35 golden path)
- `docs/dev-notes.md` (discount codes manual-Stripe-first note)
- `src/shared/db/database.types.ts` (subscriptions + subscription_events + discount_codes)
- `src/shared/db/app.types.ts` (SubscriptionRow + DiscountCodeRow)
- `src/shared/api/planterClient.ts` (`billing.*`)
- `src/pages/Settings.tsx` (Billing tab)
- `src/features/projects/components/NewProjectForm.tsx` (license gate)
- `src/features/projects/components/InviteMemberModal.tsx` (license gate)
- `src/app/router.tsx` — add `/admin/discount-codes`
- `spec.md` (flip §3.7 Store + License Management to `[x]`, bump to 1.20.0)
- `repo-context.yaml` (Wave 35 highlights)
- `CLAUDE.md` (Tables + Billing subsection)
- `.env.example` (5 new Stripe env vars)

**Will create:**
- `docs/db/migrations/2026_XX_XX_subscriptions.sql`
- `docs/db/migrations/2026_XX_XX_license_enforcement.sql`
- `docs/db/migrations/2026_XX_XX_discount_codes.sql`
- `docs/db/tests/license_enforcement.sql`
- `docs/db/tests/discount_codes_redemption.sql`
- `docs/architecture/billing.md`
- `src/shared/constants/billing.ts`
- `src/features/settings/hooks/useSubscription.ts`
- `src/pages/admin/AdminDiscountCodes.tsx`
- `supabase/functions/stripe-checkout/index.ts`
- `supabase/functions/stripe-checkout/README.md`
- `supabase/functions/stripe-portal/index.ts`
- `supabase/functions/stripe-portal/README.md`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/stripe-webhook/README.md`
- `Testing/unit/shared/api/planterClient.billing.test.ts`
- `Testing/unit/shared/api/planterClient.discountCodes.test.ts`
- `Testing/unit/shared/constants/billing.test.ts`
- `Testing/unit/features/settings/hooks/useSubscription.test.tsx`
- `Testing/unit/pages/Settings.billing.test.tsx`
- `Testing/unit/pages/admin/AdminDiscountCodes.test.tsx`
- `Testing/unit/features/projects/components/NewProjectForm.licenseGate.test.tsx`
- `Testing/unit/supabase/functions/stripe-webhook.test.ts`

**Explicitly out of scope this wave:**
- Annual vs monthly pricing
- Multi-seat / team billing
- Tax beyond Stripe defaults
- Currency switching
- Soft-limit grace period
- Tier downgrade strand handling
- Self-serve discount code creation
- Per-org discount codes
- Stripe Connect / partner revenue sharing

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files (import directly from concrete paths); path alias `@/` → `src/`; no raw date math (`current_period_end` comparison goes through `date-engine`); no direct `supabase.from()` in components (`planterClient.billing.*`); Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; max subtask depth = 1; template vs instance clarified on any cross-cutting work; one new dep allowed: `stripe` (Deno ESM for the edge functions); atomic revertable commits; build + lint + tests all clean before every push; DB migrations are additive-only — license-enforcement triggers are additive (they raise on violation, never modify existing data); Stripe webhook MUST verify signatures and MUST be idempotent on `stripe_event_id` UNIQUE — failure mode is silent duplicate-drop, not exception.
