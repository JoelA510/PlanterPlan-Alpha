# Release Readiness Ledger

This ledger records the release-hardening close-out state as of 2026-05-09,
after PR #256 (`1a01d981`). It is intentionally evidence-based: passing checks
and merged PRs are listed separately from accepted risks and blocked validation.

## Scope

- Runtime: Vite, React `18.3.1`, TypeScript, Supabase.
- Client env names: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optional
  public `VITE_VAPID_PUBLIC_KEY`.
- Unsupported assumptions: Create React App, `REACT_APP_*` env names, React 19,
  broad dependency upgrades, two-way calendar sync, and template
  reconciliation/sync.

## Merged release-hardening work

| Area | PR | Outcome |
| --- | --- | --- |
| Project creation smoke | #213 `test: add project creation smoke coverage` | Already on `main`; PR20 reconfirmed blank project, official-template creation, and no-note-copy coverage. |
| Critical release E2E gate | #229 `Add critical release E2E regressions` | Added the release BDD suite and fixed phase-unlock plus table-grant blockers exposed by it. |
| RBAC matrix | #238 `fix: harden task role matrix enforcement` | Owner/editor/admin/coach/viewer/limited behavior characterized and enforced below UI. |
| Template scaffold policy | #239 `test: harden template scaffold policy docs` | Protected scaffold behavior documented and covered against DB trigger behavior. |
| Account lifecycle | #240 `test: harden account lifecycle coverage` | Deletion/anonymization behavior characterized without weakening auditability. |
| Task hierarchy | #241 `test: harden task hierarchy invariants` | Depth and cycle invariants covered below UI. |
| Date envelopes | #242 `test: harden date envelope rollup coverage` | Parent/child date envelope and rollup behavior covered. |
| Completion rollups | #243 `fix: harden completion rollup regressions` | Completion cascade, reopen, phase unlock, and mixed-field regressions covered. |
| ICS tokens | #244 `fix: harden ics token lifecycle` | Token revocation, one-way lifecycle, and scoping covered. |
| Comments and mentions | #245 `fix: scope comment mention notifications` | Mention metadata and hydration behavior hardened. |
| Admin moderation | #246 `fix: secure admin reset link display` | Admin moderation UI no longer exposes reset links casually; server authorization remains the gate. |
| Boot configuration | #247 `fix: surface missing env configuration safely` | Missing Vite envs render a safe boot error instead of crashing at import time. |
| Project realtime | #248 `fix(projects): centralize project realtime subscription` | Project task realtime subscriptions centralized and test-covered. |
| Gantt export | #249 `docs(gantt): document print-backed PDF export` | Launch-visible export surface clarified as browser print/save-as-PDF, not dead PDF generation. |
| PWA service worker | #250 `fix(pwa): harden service worker push payload fallback` | Push payload parsing and service worker guardrails improved. |
| Tasks first-run empty state | #251 `fix(tasks): guide first-run project creation` | Primary task surface guides empty users to project creation flows. |
| Mobile/accessibility | #252 `fix(a11y): add mobile-safe task movement` | Mobile-safe task movement path added and covered. |
| Large-tree guardrails | #253 `perf(tasks): add large-tree guardrails` | Large task-tree regressions covered without broad virtualization rewrites. |
| Spanish release gate | #254 `test(i18n): enforce Spanish release gate` | Spanish remains machine-translated and explicitly not marketing-ready. |
| Metadata/docs guardrails | #255 `chore(release): refresh metadata and guardrail docs` | Package metadata and docs match Vite/React 18/pinned dependency reality. |
| Regression close-out | #256 `test(release): document regression coverage closeout` | Release checklist mapped to executable coverage and SSoT contradictions. |

## Final validation status

| Command | Status | Notes |
| --- | --- | --- |
| `npm ci` | Passed | 0 vulnerabilities reported. |
| `npm run verify-dependencies` | Passed | React/React DOM/React Is pins, Gantt pin, type packages, and dnd-kit guardrails verified. |
| `npm run verify-architecture` | Passed | No structural violations found. |
| `npm run lint` | Passed | Zero ESLint errors. |
| `npm test` | Passed | 138 files, 1128 tests. |
| `npm run build` | Passed | Vite emitted the known chunk-size warning; no build failure. |
| `npm run db:local:test` | Passed | 16 pgTAP files, 223 tests. This reset the local Supabase public schema only. |
| `node scripts/seed-e2e.js` | Passed | Local E2E user already existed; public anon key was redacted by the script. |
| `npm run test:e2e:release` | Passed | 8 release-tagged Playwright tests. |
| `npm run test:e2e:mobile` | Passed | 11 mobile tests; existing Radix `DialogContent` description warning was non-fatal. |
| `npm run test:e2e:a11y` | Passed | 14 accessibility tests. |
| `git diff --check` | Passed | No whitespace errors in the PR21 diff. |
| `vercel env run -e preview -- npm run build` | Blocked locally | `vercel` is not installed on PATH. `npx --yes vercel@latest whoami` failed with an invalid token; `npx --yes vercel@latest env run -e preview -- npm run build` entered a device-login flow and was terminated without authenticating. |
| `vercel env run -e preview -- npm test` | Not run | Same local Vercel authentication blocker; no Vercel env values were printed. |

## Deployment and environment posture

- GitHub CI on PR #256 was green for Build & Test, E2E Tests, CodeQL, Vercel,
  Vercel Preview Comments, and Release Drafter after the final follow-up commit.
- Vercel GitHub preview deployment for PR #256 reported Ready.
- Local Vercel preview-env validation is not complete because the Vercel CLI is
  not installed on PATH and the available `npx` flow cannot authenticate
  non-interactively in this environment. The smallest later verification step
  is:

  ```bash
  vercel login
  vercel env run -e preview -- npm run build
  vercel env run -e preview -- npm test
  ```

- Do not commit `.vercel/`, `.env.local`, or pulled Vercel/Supabase secrets.

## Remaining accepted risks

| Severity | Risk | Current decision |
| --- | --- | --- |
| P1 | Local Vercel preview-env build/test validation is blocked by missing or invalid CLI authentication. | Do not declare production release-ready until an operator refreshes Vercel auth and reruns the preview-env build/test commands. |
| P2 | Dependency-order completion warning prompts are not a current trusted feature. | Contradicted by `docs/architecture/tasks-subtasks.md`; future work requires DB/API enforcement before becoming a release gate. |
| P2 | Legacy full E2E inventory is broader than the curated release gate. | Keep `npm run test:e2e:release`, mobile, and accessibility suites as release gates until stale legacy scenarios are curated. |
| P2 | Spanish is machine-translated. | Keep `es` marked review-required and do not market Spanish support until native-speaker review lands. |
| P3 | Vite emits a large chunk warning during production build. | Accepted non-blocker unless bundle work becomes a separate performance PR. |

## Release statement

As of this ledger, the codebase passes the local release-candidate validation
gate. Production release readiness remains conditional on completing Vercel
preview-env build/test validation with valid operator credentials.
