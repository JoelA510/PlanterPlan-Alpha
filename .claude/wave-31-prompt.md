## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 30 shipped to `main`:
- `notification_preferences` + `notification_log` + `push_subscriptions` tables + bootstrap trigger
- Web Push subscription hook + service worker + `dispatch-push` edge function
- Comment mention resolution + `dispatch-notifications` cron + `overdue-digest` daily/weekly cron
- New Settings → Notifications tab with quiet-hours + per-event toggles

Spec is at **1.15.0**. Outstanding roadmap: §3.1 Localization (this wave), §3.7 White Labeling / Store / Admin / External Integrations (Waves 33–36), §3.8 PWA + Offline (Wave 32), Wave 37 architecture-doc gap closures, Wave 38 release readiness.

Wave 31 ships the **Localization Framework** (§3.1). This is foundational infrastructure — once strings are extracted and the runtime is in place, future waves can ship UI in any locale without revisiting the i18n plumbing. Scope: `i18next` setup + en-US baseline (every existing string extracted) + locale switcher + `Intl`-based date/number/currency formatting + **one** additional locale shipped as proof of pipeline (Spanish — `es`). Other locales become a translator-only task post-Wave-31.

**Gate baseline going into Wave 31:** confirm the current `main` baseline. Run `npm run lint`, `npm run build`, `npx vitest run`. The string-extraction half of this wave will touch a **lot** of files — expect the diff to be large but mostly mechanical.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-31-i18n-framework`
- Task 2 → `claude/wave-31-string-extraction`
- Task 3 → `claude/wave-31-spanish-locale`

Open a PR to `main` after each task's verification gate passes. Do **not** push directly to `main`. **Strongly recommend per-task PRs** so the giant string-extraction diff in Task 2 doesn't bury the framework setup or the Spanish locale.

## Wave 31 scope

Three tasks. Task 1 is small (framework wiring, locale switcher, Intl formatters). Task 2 is the bulk-mechanical extraction. Task 3 is the proof-of-pipeline Spanish translation (machine-translated baseline acceptable for v1; a human-review TODO is documented).

---

### Task 1 — i18n framework + locale switcher + Intl formatters

**Commit:** `feat(wave-31): i18next + react-i18next + locale switcher + Intl formatters`

The runtime layer that every other localizable surface plugs into.

1. **Dependencies** (`package.json`) — add `i18next`, `react-i18next`, `i18next-browser-languagedetector`. Three new deps, motivated in the PR (industry-standard, well-maintained, TypeScript-first). No alternatives considered: this is the only viable React i18n stack at our scale.

2. **i18n initialization** (`src/shared/i18n/index.ts`, NEW)
   - Initialize `i18next` with:
     - `lng`: detected from `localStorage` (`'planterplan.locale'`) or `navigator.language`, falling back to `'en'`.
     - `fallbackLng: 'en'`.
     - `resources` loaded statically from `./locales/en.json` and `./locales/es.json` (Task 3 fills the latter).
     - `interpolation: { escapeValue: false }` (React handles XSS).
     - `defaultNS: 'common'`, `ns: ['common', 'auth', 'tasks', 'projects', 'library', 'dashboard', 'settings', 'notifications', 'errors']`.
   - Export `i18n` instance.

3. **Provider wiring** (`src/main.tsx` or `src/app/providers.tsx`)
   - Wrap the app in `<I18nextProvider i18n={i18n}>`. Mount before `<QueryClientProvider>` and `<AuthProvider>`.

4. **Locale switcher UI** (`src/features/settings/components/LocaleSwitcher.tsx`, NEW)
   - Shadcn `Select` with the supported locales (English, Español for Wave 31; future locales drop into the array). On change: `i18n.changeLanguage(code)` + `localStorage.setItem('planterplan.locale', code)`.
   - Mounted inside the existing Settings → Profile tab as a new row (label: i18n key `settings.profile.locale`).

5. **Intl formatters** (`src/shared/i18n/formatters.ts`, NEW; **ALL date/number/currency UI display goes through these**)
   - `formatDateLocalized(iso: string, format: 'short' | 'long' | 'relative')`:
     - `short` → `Intl.DateTimeFormat(currentLocale, { dateStyle: 'medium' })`.
     - `long` → `{ dateStyle: 'full' }`.
     - `relative` → `Intl.RelativeTimeFormat(currentLocale, { numeric: 'auto' })` ("3 days ago", "in 2 hours").
   - `formatNumberLocalized(n: number, opts?: Intl.NumberFormatOptions)`.
   - `formatCurrencyLocalized(n: number, currency: string)`.
   - `currentLocale()` reads from `i18n.language`; helpers refresh on language change via the React context if any consumer needs reactivity (most don't — they're called inside render).
   - **NOT a replacement for `formatDisplayDate`** in `date-engine` for *internal* date math — `date-engine` keeps its UTC-anchored ISO-string contract. The Intl formatters wrap *display only*. Document this split in `formatters.ts` JSDoc.

6. **TypeScript typing** (`src/shared/i18n/i18n.d.ts`, NEW)
   - Module augment `react-i18next` so `t('tasks.title')` is typed against the en.json structure: `declare module 'i18next' { interface CustomTypeOptions { defaultNS: 'common'; resources: { common: typeof import('./locales/en.json'); ... } } }`.
   - This catches typos at build-time once the namespaces are populated in Task 2.

7. **Architecture doc** (`docs/architecture/i18n.md`, NEW — new domain doc)
   - Sections: Stack (i18next + react-i18next + browser-languagedetector); Locale catalog (`en` baseline, `es` proof); File layout (`src/shared/i18n/locales/{lang}.json` with namespace-keyed sections); String-extraction conventions (snake_case keys, namespace prefix); Date/number formatting split (Intl for display, date-engine for math); Switching the locale (Settings UI + persistence to localStorage); Adding a new locale (translator workflow — copy `en.json`, translate, ship as a PR).
   - Cross-link from `CLAUDE.md` Tech Stack section.

8. **Tests**
   - `Testing/unit/shared/i18n/formatters.test.ts` (NEW) — `formatDateLocalized` produces locale-correct output for `en` and `es`; `formatNumberLocalized` honors locale grouping; `formatCurrencyLocalized` produces the right symbol.
   - `Testing/unit/features/settings/components/LocaleSwitcher.test.tsx` (NEW) — switching the locale persists to localStorage and triggers re-render of a downstream `t()` consumer.

**DB migration?** No.

**Out of scope:** RTL support (defer until first RTL locale ships); per-project locale (a project doesn't have a locale — only a user does); locale-aware fuzzy matching in the Master Library search (deferred — would need ICU collation or similar).

---

### Task 2 — String extraction (en baseline)

**Commit:** `chore(wave-31): extract every UI string to en.json across all features`

The bulk-mechanical pass. Every user-visible English string in `src/` moves into `src/shared/i18n/locales/en.json` and is replaced with `t('namespace.key')`. **Touches ~every component file** — expect a diff in the thousands of lines, mostly trivial.

1. **String-extraction conventions**
   - **Namespace per domain**: `auth`, `tasks`, `projects`, `library`, `dashboard`, `settings`, `notifications`, `common` (cross-cutting strings like Cancel/Save), `errors` (toast errors).
   - **Key naming**: `domain.section.element` — e.g., `tasks.detail.related_tasks_heading`, `tasks.form.title_label`, `common.cancel`, `errors.network_failed`.
   - **Pluralization**: use i18next's built-in plural form (`{ count: 0 }` triggers `_zero`, `_other` etc.). Update keys accordingly.
   - **Interpolation**: `t('tasks.dispatch.shifted_count', { count: 5 })` reads from `"shifted_count_other": "{{count}} tasks rescheduled"`.
   - **Inline-only strings** (e.g., aria-labels) **also extract**. Don't leave any English in JSX.

2. **Per-domain extraction passes** — split into discrete commits within the same branch for reviewability:
   - `chore(wave-31): extract auth strings`
   - `chore(wave-31): extract tasks strings` (the largest)
   - `chore(wave-31): extract projects strings`
   - `chore(wave-31): extract library strings`
   - `chore(wave-31): extract dashboard strings`
   - `chore(wave-31): extract settings strings`
   - `chore(wave-31): extract notifications strings`
   - `chore(wave-31): extract common + errors strings`
   - Each commit lands as a self-contained refactor — running the dev server after each should still produce a fully English UI. Just less stringly-typed.

3. **Date and number rendering** — replace every direct call to `formatDisplayDate` (which lives in `date-engine`) at *display* sites with `formatDateLocalized` from `formatters.ts`. **Internal date math (sorting, comparison, persistence) keeps using the date-engine ISO contract.**

4. **`en.json` validation** (`Testing/unit/shared/i18n/en-json.test.ts`, NEW)
   - Asserts every namespace exists.
   - Asserts no duplicate keys across namespaces (catches a common refactor mistake).
   - Asserts no value is an empty string.
   - Asserts every plural-form key has both `_one` and `_other` variants.

5. **Lint rule** (optional — defer if it slows the wave) — investigate adding `eslint-plugin-i18next` (specifically the `no-literal-string` rule) to catch hard-coded English in JSX. **Default**: skip the rule for Wave 31 (too noisy on existing code); revisit in Wave 38 release readiness.

6. **Tests** — Wave 31 should not change *behavior*, only string sources. Run the full unit suite after each per-domain commit. Tests that snapshot or assert exact rendered strings need to either:
   - Update to assert the i18n key (`expect(...).toHaveTextContent(t('tasks.detail.related_tasks_heading'))`), or
   - Re-snapshot with the rendered English value (which should be identical to before).

   **Default**: re-snapshot — keeps tests readable. Document this choice in the PR.

**DB migration?** No.

**Out of scope:**
- Translator tooling (Lokalise / Crowdin integration) — deferred (post-1.0).
- Right-to-left rendering — deferred (first RTL locale would need it).
- Localized error messages from edge functions / Resend templates — deferred (server-side templates stay English for v1; the email body is data-driven, so the *content* localizes via the user's stored locale; the template chrome stays English until a separate translator pass).
- Pluralization of complex CLDR rules beyond English / Spanish (Slavic, Arabic patterns) — deferred until a locale needs them.

---

### Task 3 — Spanish locale (proof of pipeline)

**Commit:** `feat(wave-31): es.json — Spanish translation (machine-translated baseline; human review pending)`

Proof that the framework works end-to-end with a non-English locale. Single deliverable: `src/shared/i18n/locales/es.json`.

1. **Translation source** — start from `en.json` and translate via DeepL or Google Translate (machine-translated is acceptable for v1). The PR description **must** call this out as machine-translated and request a human review pass before promoting any user-facing marketing of "Spanish support."

2. **Add a `TODO(translation-review)` marker** at the top of `es.json` (as a `_meta` key) so it's visible in the file:
   ```json
   {
     "_meta": {
       "status": "machine-translated; pending human review",
       "translator": "deepl|google",
       "review_required_before_marketing": true
     },
     "common": { ... },
     ...
   }
   ```

3. **Wire into the locale switcher** — already done in Task 1's `LocaleSwitcher` (the array is updated to include `{ code: 'es', label: 'Español' }`).

4. **Smoke pass** — flip the locale in the running app to `es` and walk every page. Anything that still renders in English or breaks layout (Spanish strings are typically 20–30% longer than English) is a string that wasn't extracted in Task 2 and needs to be backported. **Treat this as the validation pass for Task 2's completeness.**

5. **Pluralization sanity** — pick three pluralized keys (e.g., `tasks.dispatch.shifted_count`, `notifications.recent_count`, `library.results_count`) and confirm the Spanish forms render correctly with `{ count: 0 }`, `{ count: 1 }`, `{ count: 5 }`.

6. **Tests** — `Testing/unit/shared/i18n/es-json.test.ts` (NEW) mirrors `en-json.test.ts`: every namespace + key from `en.json` exists in `es.json` (no missing translations); no empty string values; the `_meta` block is present.

**DB migration?** No.

**Out of scope:** Other locales (any future locale is a translator-only PR — copy `en.json`, translate, add to the switcher). Locale-specific UI tweaks (e.g., longer Spanish labels overflowing certain narrow containers — fix-as-found in Wave 38 release readiness).

---

## Documentation Currency Pass (mandatory — before review)

1. **`spec.md`** — flip §3.1 Localization from `[ ]` to `[x]` with a sub-bullet: "Framework + en baseline + es proof of pipeline (Wave 31)." Bump version to **1.16.0**. Update `Last Updated`.
2. **`docs/AGENT_CONTEXT.md`** — add "i18n Framework (Wave 31)" golden-path bullet pointing to `i18n.md` + `formatters.ts` + the `LocaleSwitcher` in Settings.
3. **`docs/architecture/i18n.md`** is in (Task 1).
4. **`docs/architecture/date-engine.md`** — append a one-line note: "Wave 31: display-time date formatting uses `formatDateLocalized` (in `src/shared/i18n/formatters.ts`); internal date math stays UTC-anchored ISO strings here. Don't conflate the two."
5. **`docs/dev-notes.md`** — add active entry: "Spanish translations are machine-translated (Wave 31). Human review pending before marketing as 'Spanish support'." Keep this on the active list until a translator review PR lands.
6. **`repo-context.yaml`** — bump `wave_status.current` to `Wave 31 (Localization Framework)`, update `last_completed`, `spec_version`, add `wave_31_highlights:` block.
7. **`CLAUDE.md`** — under Tech Stack, add `i18next + react-i18next` as the i18n layer. New "Localization" subsection: locale persistence in `localStorage.planterplan.locale`; namespace structure; "all UI strings must be in `en.json` — no hard-coded English in JSX after Wave 31."
8. **`.env.example`** — no change.

Land docs as `docs(wave-31): documentation currency sweep`.

## Wave Review (mandatory — before commit + push to main)

1. **Locale persistence** — change locale in Settings → reload → still in the same locale. Open a private window → defaults to `en` (no localStorage).
2. **Date formatting consistency** — every date in the UI renders via `formatDateLocalized`. Grep for direct `Intl.DateTimeFormat(...)` calls outside `formatters.ts` — should be zero hits.
3. **No hardcoded English in JSX** — grep for common English words inside JSX text nodes (e.g., `>Save<`, `>Cancel<`). Fix any holdouts before pushing. The eslint rule deferral makes this manual; an Agent should enumerate every `.tsx` file changed and visual-scan for English remnants.
4. **es.json completeness** — `Testing/unit/shared/i18n/es-json.test.ts` is green; manual smoke per Task 3 step 4 surfaced no English remnants.
5. **Bundle size** — i18next + react-i18next + browser-languagedetector + the `en.json` and `es.json` resources should add ~50–80 KB to the main bundle. Verify with `npm run build` size report.
6. **No FSD drift** — `shared/i18n/` is in `shared/`; `LocaleSwitcher` is in `features/settings/`. Locale-aware components import only from `react-i18next` + `shared/i18n/`.
7. **Test coverage** — every new file has a matching test mirror; the en/es validation tests are green.
8. **Lint + build + tests** — green (some snapshot updates expected from Task 2; review them carefully — they should differ only in being i18n-routed).

## Commit & Push to Main (mandatory — gates Wave 32)

After all three Tasks merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npx vitest run`.
2. The history should show: 3 task commits (or more, if the per-domain extraction commits land separately) + 1 docs sweep commit on top of Wave 30.
3. Push to `origin/main`. CI green.
4. **Do not start Wave 32** until the above is true.

## Verification Gate (per task, before push)

```bash
npm run lint      # 0 errors (warnings baseline ≤7, do not regress)
npm run build     # clean (tsc -b && vite build)
npx vitest run    # baseline + new tests
git status        # clean
```

Manual smoke: locale-switch in Settings; walk every page in `es`; compare layouts with `en` (Spanish text is longer — visual overflow is acceptable for v1 unless severe).

## Key references

- `CLAUDE.md` — conventions, commands, architecture overview
- `.gemini/styleguide.md` — strict typing, FSD boundaries, Tailwind constraints, no arbitrary values
- `docs/architecture/date-engine.md` — read before touching date display sites; the format/Intl split is critical
- i18next + react-i18next docs — read API contract; the typing dance with module augmentation is the trickiest bit

## Critical Files

**Will edit:**
- ~every `.tsx` file in `src/` for Task 2 string extraction (touches `features/`, `pages/`, `layouts/`, `shared/ui/`)
- `src/main.tsx` (or providers.tsx) — wrap in `<I18nextProvider>`
- `src/pages/Settings.tsx` — mount `LocaleSwitcher`
- `package.json` (3 new deps)
- `docs/architecture/date-engine.md` (Intl/date-engine split note)
- `docs/AGENT_CONTEXT.md` (Wave 31 golden path)
- `docs/dev-notes.md` (Spanish review-pending entry)
- `spec.md` (flip §3.1 to `[x]`, bump to 1.16.0)
- `repo-context.yaml` (Wave 31 highlights)
- `CLAUDE.md` (Tech Stack + Localization subsection)

**Will create:**
- `src/shared/i18n/index.ts`
- `src/shared/i18n/formatters.ts`
- `src/shared/i18n/i18n.d.ts`
- `src/shared/i18n/locales/en.json`
- `src/shared/i18n/locales/es.json`
- `src/features/settings/components/LocaleSwitcher.tsx`
- `docs/architecture/i18n.md`
- `Testing/unit/shared/i18n/formatters.test.ts`
- `Testing/unit/shared/i18n/en-json.test.ts`
- `Testing/unit/shared/i18n/es-json.test.ts`
- `Testing/unit/features/settings/components/LocaleSwitcher.test.tsx`

**Explicitly out of scope this wave:**
- Translator tooling (Lokalise / Crowdin)
- Other locales beyond `es`
- RTL support
- Locale-aware Master Library search
- Localized email/PDF templates server-side
- `eslint-plugin-i18next no-literal-string` (Wave 38 maybe)
- Locale-aware fuzzy date parsing for inputs (deferred — date inputs use native `<input type="date">` which is locale-aware automatically)

## Ground Rules (non-negotiable — from `CLAUDE.md` + `.gemini/styleguide.md`)

TypeScript-only; no `.js` / `.jsx`; no barrel files (import directly from concrete paths); path alias `@/` → `src/`; no raw date math (the Intl/date-engine split must be respected — Intl for display, date-engine for math); no direct `supabase.from()` in components; Tailwind utility classes only (no arbitrary values, no pure black — use `slate-900` / `zinc-900`); optimistic mutations must force-refetch on error; max subtask depth = 1; template vs instance clarified on any cross-cutting work; only add dependencies if truly necessary (Wave 31 adds **three**: i18next, react-i18next, i18next-browser-languagedetector — each motivated); atomic revertable commits; build + lint + tests all clean before every push; Spanish translations are machine-translated and explicitly flagged as such — don't market as "Spanish support" until a human-review pass lands.
