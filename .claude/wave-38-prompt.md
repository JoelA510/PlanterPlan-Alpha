## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 37 shipped to `main`:
- Date engine: opt-in weekend + holiday skipping with per-org holiday calendars
- Invite escrow: pending-invites table + auto-claim trigger on signup
- Template versioning: per-template `template_version` + per-instance `cloned_from_template_version` stamps
- Template immutability: `cloned_from_task_id` + UI delete-guard for non-owners
- Task-tree virtualization: react-virtuoso for projects with >500 tasks

Spec is at **1.22.0**. Every functional roadmap item is `[x]`. Every architecture-doc known-gap is closed. The wave-by-wave feature delivery loop is **complete**.

Wave 38 is the **final QA + release readiness pass** for the **1.0.0 cutover**. No new features. Five workstreams converge into one wave because each individually wouldn't justify its own — but they together represent the difference between "app works" and "app ships."

**Gate baseline going into Wave 38:** confirm the current `main` baseline. Run `npm run lint`, `npm run build`, `npx vitest run`, `npm run test:e2e`. Snapshot every metric: lint warning count, bundle size by chunk, test count, E2E pass rate, Lighthouse scores (PWA, Performance, Accessibility, SEO, Best Practices), and Supabase RLS smoke status. The wave's verification gate compares against this snapshot — anything that regresses must be fixed before the 1.0.0 cutover.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-38-e2e-coverage`
- Task 2 → `claude/wave-38-accessibility-audit`
- Task 3 → `claude/wave-38-security-review`
- Task 4 → `claude/wave-38-performance-budgets`
- Task 5 → `claude/wave-38-release-cutover`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`. **Task 5 lands LAST** — it includes the version bump, README freeze, and CHANGELOG generation.

## Wave 38 scope

Five tasks. Tasks 1-4 are independent and can run in parallel branch-wise. Task 5 is the cutover and must merge after the others.

---

### Task 1 — E2E coverage matrix

**Commit:** `test(wave-38): expand Playwright BDD coverage to 1.0 release matrix`

The existing E2E suite in `Testing/e2e/` covers golden paths. Wave 38 expands to a release-grade matrix: every persona × every critical flow.

1. **Persona × flow matrix** (document in `Testing/e2e/COVERAGE.md`, NEW)

| Persona | Flows |
| --- | --- |
| **Anonymous (logged out)** | Landing page loads; login form validates; signup form validates; password reset flow; invalid token redirect; org-branded login (Wave 34) |
| **Free-tier user** | Create project (1st OK, 2nd blocked with upgrade CTA — Wave 35); invite member (limited by plan); checkout flow (Stripe test mode → success redirect) |
| **Pro/Network user** | Create up to plan limit; create project from template; clone library task; archive/unarchive; complete a task and watch milestone auto-complete; configure recurrence on a template |
| **Project owner** | Invite an existing user (auto-add); invite a non-existent email (escrow → Wave 37); change a member's role; remove a member; assign Phase Lead (Wave 29); flip project to Checkpoint kind; configure supervisor email + send test report |
| **Editor** | Edit task body/dates; reorder via DnD; create subtask (max-depth-1 enforced); cannot invite/manage members (UI-gated) |
| **Viewer (limited) with Phase Lead** | Edit tasks under assigned phase only; sibling phases read-only |
| **Coach** | Edit only `is_coaching_task=true` rows (Wave 22); auto-assigned to coaching task on creation (Wave 23); backfilled on coach-membership change (Wave 24) |
| **Admin** | `/admin` accessible; global search returns mixed results; user filter; analytics dashboard renders; create/revoke discount codes; create org; assign org_admin |
| **Org-admin** | Edit own org branding; cannot see other orgs in admin listing |

2. **Implementation** (`Testing/e2e/features/`)
   - One feature file per major flow group (`auth.feature`, `project-creation.feature`, `task-editing.feature`, `team.feature`, `templates.feature`, `billing.feature`, `admin.feature`, `org-branding.feature`).
   - Each scenario uses Playwright BDD's Gherkin syntax (existing pattern in the repo). Reuse `Testing/test-utils/` helpers.
   - Wire fixtures for each persona — `Testing/e2e/fixtures/personas.ts` (NEW) creates each persona via Supabase admin API in `beforeAll` and tears down in `afterAll`. Idempotent so the suite can run repeatedly.

3. **Coverage report** (`Testing/e2e/COVERAGE.md`)
   - Markdown table mapping personas × flows × pass/fail/skip status. Auto-update via a small post-test reporter (defer if Playwright BDD doesn't support it natively — manually maintain for v1).

4. **CI integration** — if a CI pipeline exists (`.github/workflows/`), confirm `npm run test:e2e` runs in CI. If not, add a `test:e2e` job to a new `.github/workflows/e2e.yml` that boots a local Supabase instance and runs the suite. Skip this if CI is operator-deferred.

5. **Tests** — Wave 38 itself has no unit tests; the deliverable IS the E2E suite. Final E2E count target: ≥150 scenarios across 8 feature files.

**DB migration?** No.

**Out of scope:** Visual regression / screenshot diffs (deferred — large maintenance burden; Playwright has built-in support but defer the snapshot-baseline pass to a post-1.0 hardening wave). Cross-browser matrix beyond Chromium (deferred — Chromium-only for v1).

---

### Task 2 — Accessibility audit (WCAG 2.1 AA)

**Commit:** `a11y(wave-38): WCAG 2.1 AA audit + fixes across all primary surfaces`

1. **Audit tools** — install `@axe-core/playwright` as dev dep. Add an axe scan to every E2E scenario in Task 1 via a fixture `expectNoA11yViolations(page)`. Fail the test on any new violation.

2. **Audit pass** — run `npx playwright test --project=chromium` after Task 1's fixtures land. Catalog every axe violation in `docs/operations/a11y-audit.md` (NEW) with: rule id, surface, severity, fix-or-defer decision.

3. **Common fixes** (apply across `src/features/`, `src/pages/`, `src/shared/ui/`):
   - Missing `aria-label` on icon-only buttons.
   - Color contrast failures (Tailwind `text-slate-400` over `bg-slate-100` is borderline; lift to `text-slate-600` where it doesn't break visual hierarchy).
   - Form labels not associated with inputs (Shadcn primitives mostly handle this, but verify every `<input>` has a connected `<Label>`).
   - Focus-trap on modal dialogs (Radix UI handles this; verify on every Shadcn `Dialog` usage).
   - Skip-to-content link in `DashboardLayout.tsx`.
   - `<html lang>` matches the current i18n locale (Wave 31).

4. **Keyboard-only smoke test** — manually navigate a full task-edit flow without touching the mouse. Tab order, Enter/Space activation, Esc dismissal, arrow-key tree navigation. Fix any traps.

5. **Screen-reader smoke test** — using NVDA (Windows) or VoiceOver (macOS), navigate the dashboard + task detail. Note any unannounced state changes (e.g., toast notifications need `role="status"` or `aria-live`).

6. **Lint rule** — add `eslint-plugin-jsx-a11y` to `eslint.config.js` if not already present. Fix any rule violations introduced.

7. **Documentation** (`docs/operations/a11y-audit.md`)
   - Final state: `WCAG 2.1 AA` compliance with a list of accepted exceptions (and why each is acceptable).

**DB migration?** No.

**Out of scope:** WCAG 2.2 (deferred — 2.1 AA is the v1 bar). Mobile screen-reader (TalkBack/VoiceOver iOS) — deferred to Wave 39 if any. Manual screen-reader testing scripted into CI — practically infeasible; manual quarterly review is the v1 commitment.

---

### Task 3 — Security review

**Commit:** `security(wave-38): owasp top-10 audit + RLS smoke test runner + secret scrub`

1. **OWASP Top 10 audit** (document in `docs/operations/security-audit.md`, NEW)
   - **A01 Broken Access Control**: review every RLS policy + every SECURITY DEFINER function. Confirm `is_admin(auth.uid())` gates are present at function entry. Confirm no `RAISE NOTICE` leaks user data.
   - **A02 Cryptographic Failures**: confirm all secrets stored in env vars (Stripe, Resend, AWS, Zoho, VAPID); audit `localStorage` for any sensitive persistence — only the locale + tenant ID + install-prompt timestamp should be there.
   - **A03 Injection**: SQL injection — confirm no string concatenation in any DB-bound code; everything routes through parameterized `planterClient` methods or RPCs. XSS — Radix/Shadcn handles HTML escaping; spot-check any `dangerouslySetInnerHTML` usage (should be zero).
   - **A04 Insecure Design**: review the most-recent-wins offline replay (Wave 32) — already documented as a known limitation; confirm the doc is honest about the trade-off.
   - **A05 Security Misconfiguration**: confirm Vite production build doesn't leak source maps publicly (`build.sourcemap: false` in `vite.config.ts` for prod). Confirm Supabase RLS is enabled on every table (`SELECT relname FROM pg_class WHERE relkind = 'r' AND relrowsecurity = false AND relnamespace = 'public'::regnamespace` should return empty for `public` schema tables).
   - **A06 Vulnerable Components**: `npm audit --production` should report zero high/critical CVEs. Bump deps as needed; document any deferred CVEs with risk assessment.
   - **A07 Identification & Authentication Failures**: rate limiting on auth endpoints (Supabase handles via its rate-limit policies — confirm in dashboard). Password complexity (Supabase's defaults are acceptable). Session expiry (Supabase JWT default is 1h — confirm).
   - **A08 Software & Data Integrity Failures**: webhook signature verification (Wave 35 Stripe + Wave 36 generic webhooks both verify). Service worker integrity — workbox handles via cache versioning.
   - **A09 Security Logging & Monitoring Failures**: confirm `notification_log`, `subscription_events`, `webhook_deliveries`, `activity_log`, `zoho_sync_log` are all present + populated. Add a one-off `docs/operations/security-monitoring.md` (NEW) listing each audit log + retention guidance.
   - **A10 Server-Side Request Forgery**: any user-supplied URL (webhook target, Zoho redirect, ICS feed access)? Webhook target validates `https://` prefix (Wave 36). Confirm no other user-input URLs hit server-side fetches.

2. **RLS smoke test runner** (`docs/db/tests/run_all_rls_smokes.sh`, NEW; `docs/db/tests/runner.md`, NEW)
   - Bash script that takes a Supabase connection URL and runs every `docs/db/tests/*.sql` smoke file in sequence, reporting pass/fail.
   - Each smoke file must have a `-- EXPECT: ...` comment at the top declaring the success-state oracle (e.g., `-- EXPECT: zero rows returned`).
   - Run the suite end-to-end as part of Task 3's verification gate.

3. **Secret scrub** — run `git log -p | grep -iE 'stripe|resend|aws|vapid|zoho|api.?key|secret'` (or use a tool like `gitleaks`). Catalog any committed secret + rotate immediately.

4. **Penetration smoke** (manual, documented in `docs/operations/security-audit.md`)
   - Sign in as user A → attempt to GET another user's task by id → 404 / no rows.
   - Modify the request body to include another user's `assignee_id` → RLS blocks.
   - Hit `/admin/*` as non-admin → redirect.
   - POST forged Stripe webhook → 401.
   - POST a comment longer than 10000 chars → DB CHECK rejects.

**DB migration?** No.

**Out of scope:** Formal third-party pen-test (defer — recommended within 6 months of 1.0 launch but not blocking). HSTS / CSP headers tuning beyond Vercel defaults (defer to Wave 38.5 if needed). 2FA support (deferred — relies on Supabase Auth's TOTP; integration is a follow-up).

---

### Task 4 — Performance budgets

**Commit:** `perf(wave-38): lighthouse budget + bundle-size budget + slow-endpoint audit`

1. **Lighthouse budgets** (`lighthouse-budgets.json`, NEW)
   - Performance: ≥85 (mobile, Slow 4G).
   - Accessibility: ≥95 (Task 2 should already deliver this).
   - Best Practices: ≥95.
   - SEO: ≥85.
   - PWA: ≥90 (Wave 32 should already deliver this).
   - LCP < 2.5s, CLS < 0.1, TBT < 300ms.

2. **Bundle-size budget** (extension to `vite.config.ts` rollupOptions or a separate `bundle-budget.json`)
   - Main chunk: ≤300 KB gzipped.
   - Per-route lazy chunks (gantt, admin): ≤80 KB gzipped each.
   - Total transferred on first dashboard load: ≤500 KB gzipped.

3. **Audit and fix** — run `npm run build && npx vite preview` then Lighthouse + bundle-analyzer. Common fixes:
   - Lazy-load every route that isn't `/dashboard` (`React.lazy` + `Suspense`); already done for `/gantt` (Wave 28) and `/admin` (Wave 33), confirm + extend to `/reports`, `/tasks`, `/settings`.
   - Strip dev-only exports from production via Vite's `define` and tree-shaking.
   - Image optimization: ensure all `public/icons/` and `public/logo.*` are appropriately sized + use `<img loading="lazy">` where below-the-fold.
   - React Query default `staleTime` audit (5min is a reasonable v1 default; longer for stable lists like project members).

4. **Slow-endpoint audit** (`docs/operations/performance-audit.md`, NEW)
   - Use Supabase Studio's query insights to find p95 slow queries.
   - For each: add an index, optimize the query, or accept-and-document.
   - Common culprits expected: cross-org admin search (Task 1 of Wave 33), activity-log feed without limit (Wave 27), Master Library search without indices (Wave 22+25).

5. **CI integration** — if CI exists, add a Lighthouse-CI step that fails the build on budget regression. Defer if CI is operator-deferred.

**DB migration?** Possibly — index additions only. Each goes through the standard mirror-into-`schema.sql` flow.

**Out of scope:** SSR / SSG (deferred — single-page app is fine for v1). Service worker pre-caching tuned beyond defaults (Wave 32 covered the basics). Image CDN / responsive images (deferred — Vercel handles). React 19 compiler / forget-style optimizations (defer pending stable release of `react-compiler`).

---

### Task 5 — Release cutover (1.0.0)

**Commit:** `release(wave-38): 1.0.0 cutover — version bump, CHANGELOG, README freeze`

This task **lands last**. Only after Tasks 1-4 merge and the verification gate is green on `main`.

1. **Version bump** (`package.json`)
   - `"version": "1.0.0"` (note: this differs from the spec.md version which has been semver-tracking the 1.x.y wave evolution; the package.json was probably 0.x — bump to 1.0.0 to align).
   - `spec.md` header: bump to **1.23.0** (final pre-release polish snapshot) AND add a marker line: `> **Release tagged: v1.0.0**`.

2. **CHANGELOG** (`CHANGELOG.md`, NEW)
   - Generated from the wave history. Each wave gets a section with date, headline, and the tasks shipped.
   - Format: Keep-a-Changelog style. Top entry: `## [1.0.0] — 2026-XX-XX (Release)`.

3. **README freeze** (`README.md`)
   - Replace the current README content with a release-grade README:
     - One-paragraph product description (church-planting project management).
     - Quick-start (clone, `npm install`, env, `npm run dev`).
     - Tech stack inventory.
     - Architecture pointer (`docs/architecture/`).
     - Contributing pointer (defer detailed CONTRIBUTING.md to post-1.0).
     - License (verify a LICENSE file exists at repo root; add MIT if not — confirm with user).

4. **Deployment runbook** (`docs/operations/deployment.md`, NEW)
   - Vercel deployment step-by-step.
   - Supabase project setup + env var inventory (cross-link `.env.example`).
   - Edge function deployment (`supabase functions deploy ...`).
   - Cron schedule registration (`pg_cron` or Supabase Scheduled Triggers).
   - Custom domain setup (cross-link `docs/operations/custom-domain-setup.md` from Wave 34).
   - Stripe + Resend + AWS + Zoho + VAPID secret rotation procedures.

5. **Documentation freeze** — read every file in `docs/` for accuracy as of 1.0.0:
   - `docs/architecture/*.md`: should match current code state. No "TBD" or "TODO" markers; flip those to `## Resolved` or remove.
   - `docs/AGENT_CONTEXT.md`: golden paths reflect every wave's additions.
   - `docs/dev-notes.md`: active list should be empty (or honestly list any post-1.0 known issues).
   - `repo-context.yaml`: `wave_status.current = 'Wave 38 (Release Readiness)'`, `spec_version = '1.23.0'`, `release = '1.0.0'`.

6. **Final verification gate** (the strictest one yet):
   ```bash
   npm install                    # clean install
   npm run lint                   # 0 errors, ≤7 warnings
   npm run build                  # clean
   npx vitest run                 # all passing
   npm run test:e2e               # ≥150 scenarios passing
   npx lighthouse --view          # all budgets met
   bash docs/db/tests/run_all_rls_smokes.sh  # all green
   git status                     # clean
   ```
   - Snapshot the metrics into `docs/operations/release-metrics-1.0.0.md` (NEW): test counts, bundle sizes, Lighthouse scores, RLS test results.

7. **Tag the release**:
   - `git tag -a v1.0.0 -m "PlanterPlan 1.0.0"`
   - `git push origin v1.0.0`
   - Create a GitHub release with the CHANGELOG entry as body.

**DB migration?** No.

**Out of scope:** Post-1.0 marketing site updates. Customer-facing release notes (the CHANGELOG is the technical inventory; marketing copy is separate).

---

## Documentation Currency Pass (mandatory — before review)

Wave 38 itself **is** the documentation currency pass. Every doc listed under Task 5 step 5 is reviewed and frozen.

Additional touches:
1. **`spec.md`** — bump to **1.23.0**; add the `> **Release tagged: v1.0.0**` marker line.
2. **`docs/AGENT_CONTEXT.md`** — add a "Release Readiness (Wave 38)" golden-path bullet pointing to `docs/operations/`.
3. **`docs/dev-notes.md`** — add: "**Resolved (Wave 38):** Release 1.0.0 cutover. CHANGELOG, deployment runbook, and a11y/security/performance audits all in `docs/operations/`."
4. **`repo-context.yaml`** — bump `wave_status.current` to `Wave 38 (Release Readiness)`, set `release: '1.0.0'`, add `wave_38_highlights:` block.
5. **`CLAUDE.md`** — add a one-line "## Release Status" section at the top: "**1.0.0 released** — see `CHANGELOG.md` and `docs/operations/release-metrics-1.0.0.md` for the cutover snapshot."

Land docs as `docs(wave-38): documentation currency sweep` (or fold into the Task 5 release commit).

## Wave Review (mandatory — before commit + push to main)

Treat this as the strictest pass of all the prior wave reviews. The 1.0.0 cutover is irreversible at the social/marketing level (you can release 1.0.1 next week, but you can't un-release 1.0.0).

1. **Test count delta** — record the suite size before and after Wave 38. Should grow by ~150 E2E scenarios (Task 1) + ~30 unit tests (Tasks 2-4 fixes).
2. **A11y violation count** — `expectNoA11yViolations` should be passing in every E2E scenario.
3. **Security audit completeness** — `docs/operations/security-audit.md` covers all 10 OWASP categories with a documented stance per item. RLS smoke runner is green.
4. **Performance budgets** — Lighthouse + bundle-size budgets are met on a fresh production build.
5. **Doc accuracy** — random-spot-check three architecture docs against the current code state. Any drift → fix before tagging.
6. **CHANGELOG honesty** — every wave's commit is reflected. No "minor cleanup" omissions.
7. **Deployment runbook end-to-end** — a fresh ops-engineer should be able to follow `docs/operations/deployment.md` from `git clone` to `https://app.example.com loaded` without consulting any team member.
8. **Lint + build + tests + e2e + lighthouse + RLS smokes** — every one of the seven gates green.

## Commit & Push to Main (final)

After all five Tasks merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npx vitest run && npm run test:e2e`.
2. The history should show: 5 task commits + 1 docs sweep commit (or rolled into Task 5) on top of Wave 37.
3. Push to `origin/main`. CI green.
4. **Tag v1.0.0** per Task 5 step 7.
5. **The wave-by-wave loop terminates here.** Post-1.0 work is tracked outside this planning suite.

## Verification Gate (per task, before push)

Standard:
```bash
npm run lint      # 0 errors (warnings baseline ≤7, do not regress)
npm run build     # clean (tsc -b && vite build)
npx vitest run    # baseline + new tests
git status        # clean
```

**Plus** for Tasks 1, 2, 4 specifically:
```bash
npm run test:e2e          # all scenarios passing
npx lighthouse <url>      # all budgets met
```

**Plus** for Task 3 specifically:
```bash
bash docs/db/tests/run_all_rls_smokes.sh
npm audit --production
```

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/*.md` — domain SSoT (every doc is a release-readiness target)
- `docs/AGENT_CONTEXT.md` — codebase map (release-grade)
- `docs/db/schema.sql` — SSoT for DB objects
- `docs/db/tests/*.sql` — RLS smoke files (Task 3 wires the runner)
- `Testing/e2e/` — existing Playwright BDD scenarios (Task 1 expands)
- `Testing/test-utils/` — fixtures + helpers
- `package.json` — version bump target
- `README.md` — release freeze target

## Critical Files

**Will edit:**
- ~every doc in `docs/` (release freeze)
- `package.json` (version 1.0.0)
- `spec.md` (1.23.0 + release marker)
- `repo-context.yaml` (Wave 38 + release)
- `CLAUDE.md` (release status banner)
- `eslint.config.js` (jsx-a11y plugin)
- `vite.config.ts` (production sourcemap config)
- `README.md` (release-grade rewrite)
- ~every component file for a11y fixes (small targeted edits, mostly aria-label additions)
- `package.json` deps: `@axe-core/playwright`, `eslint-plugin-jsx-a11y`, `lighthouse-ci` (optional)

**Will create:**
- `CHANGELOG.md`
- `LICENSE` (if absent — MIT default, confirm with user)
- `Testing/e2e/COVERAGE.md`
- `Testing/e2e/fixtures/personas.ts`
- `Testing/e2e/features/*.feature` (8 new feature files)
- `lighthouse-budgets.json`
- `bundle-budget.json` (if going that route)
- `docs/operations/a11y-audit.md`
- `docs/operations/security-audit.md`
- `docs/operations/security-monitoring.md`
- `docs/operations/performance-audit.md`
- `docs/operations/deployment.md`
- `docs/operations/release-metrics-1.0.0.md`
- `docs/db/tests/run_all_rls_smokes.sh`
- `docs/db/tests/runner.md`
- `.github/workflows/e2e.yml` (optional, if CI exists)

**Explicitly out of scope this wave:**
- New features (this wave is QA + cutover only)
- Third-party pen-test
- Cross-browser E2E beyond Chromium
- Visual regression / screenshot diffing
- WCAG 2.2
- HSTS / CSP header tuning beyond Vercel defaults
- 2FA / TOTP
- React 19 compiler / forget optimizations
- SSR / SSG
- Customer-facing release notes (CHANGELOG is the technical inventory)

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx` (the workbox-built `src/sw.ts` from Wave 32 holds; no exceptions remain); no barrel files (import directly from concrete paths); path alias `@/` → `src/`; no raw date math; no direct `supabase.from()` in components; Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; max subtask depth = 1; template vs instance clarified on any cross-cutting work; **only add dependencies if truly necessary** — Wave 38 adds **at most three** dev deps (axe-core/playwright, jsx-a11y, optionally lighthouse-ci) — each motivated; atomic revertable commits; build + lint + tests + E2E + Lighthouse + RLS smokes all clean before the 1.0.0 tag; **the version tag is irreversible socially — verify everything twice before pushing the tag**.
