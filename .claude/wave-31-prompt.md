## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, Feature-Sliced Design (FSD) boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md` for the full bar.

Wave 30 shipped to `main`:
- `notification_preferences` + `notification_log` + `push_subscriptions` tables + bootstrap trigger
- Web Push hook + service worker (`public/sw.js` — documented JS exception, slated for Wave 32 subsume)
- Comment mention resolution + `dispatch-notifications` + `overdue-digest` edge functions
- `docs/operations/edge-function-schedules.md` documenting external scheduling (`pg_cron` not enabled)

Spec is at **1.15.0**. Outstanding: §3.1 Localization (this wave), §3.7 White Labeling / Store / Admin / Integrations (Waves 33–36), §3.8 PWA + Offline (Wave 32), Wave 37 doc-gap closures.

Wave 31 ships the **Localization Framework** (§3.1). Foundational infrastructure — once strings are extracted and the runtime is in place, future locales become a translator-only PR. Scope: `i18next` + en-US baseline (every existing string extracted) + locale switcher in Settings + `Intl`-based formatters + Spanish (`es`) as proof of pipeline.

**Test baseline going into Wave 31:** Wave 30 shipped at ≥640 tests. Run `npm test` and record. Lint baseline: 0 errors, ≤7 warnings — do not regress. **Note**: Task 2's string-extraction will touch ~every component file; expect a large diff but mostly mechanical.

**Read `.claude/wave-testing-strategy.md` before starting — Wave 31 is the highest-impact wave for existing tests.** Locked migration path:
1. Task 1 creates `Testing/test-utils/render-with-providers.tsx` (NEW) wrapping `<QueryClientProvider>` + `<I18nextProvider i18n={i18n}>` with eagerly-imported en.json resources.
2. After Task 1 lands but BEFORE Task 2 begins: bulk-migrate every existing `renderWithQueryClient(...)` call in `Testing/unit/` to `renderWithProviders(...)`. Most tests pass unchanged because the rendered text is identical (en.json's `t('common.save')` resolves to "Save"; the assertion `getByText('Save')` keeps working).
3. Run `npm test` after the migration and BEFORE any string extraction. The test count and pass rate should match the Wave 30 baseline exactly. If anything breaks here, the wrapper is wrong — fix it before extracting strings.
4. During Task 2's per-domain extraction commits, run `npm test` after each. Snapshot drift is allowed (`npm test -- -u` per the wave plan); assertion drift on rendered text should be near-zero (paths A guarantee).
5. Toast assertions (`expect(mockToastSuccess).toHaveBeenCalledWith('Project updated')`) keep working because `t('errors.project_update_success')` returns "Project updated" when en.json is loaded.

## Pre-flight verification (run before any task)

1. `git log --oneline -5` includes the 3 Wave 30 commits + docs sweep.
2. These files exist:
   - `src/main.tsx` (entry; Wave 31 wraps `<I18nextProvider>` here OR in `src/app/App.tsx` provider tree — read `main.tsx` first; the actual provider tree is in `App.tsx` per the codebase map)
   - `src/app/App.tsx` (provider order: `QueryClientProvider` → `AuthProvider` → `BrowserRouter` → `Toaster`)
   - `src/pages/Settings.tsx` (tabs: Profile, Notifications [Wave 30], Security; Wave 31 adds `<LocaleSwitcher>` inside Profile tab as a new row)
   - `src/shared/lib/date-engine/index.ts` (canonical date math; `formatDisplayDate` is the existing display formatter — Wave 31 layers Intl-based wrappers on top, doesn't replace)
   - `src/shared/ui/select.tsx`
3. `package.json` does NOT yet contain `i18next`, `react-i18next`, or `i18next-browser-languagedetector`. The wave adds exactly these three (no others).
4. **No `tailwind.config.ts` exists** — Tailwind v4 inline config in `src/index.css`. Locale-switcher styling uses existing tokens.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-31-i18n-framework`
- Task 2 → `claude/wave-31-string-extraction`
- Task 3 → `claude/wave-31-spanish-locale`

Open a PR to `main` after each task's verification gate passes. **Strongly recommend per-task PRs** so Task 2's giant diff doesn't bury the other two.

## Wave 31 scope

Three tasks. Task 1 is small (framework + switcher + Intl formatters). Task 2 is the bulk-mechanical extraction. Task 3 is the proof-of-pipeline Spanish translation.

---

### Task 1 — i18n framework + locale switcher + Intl formatters

**Commit:** `feat(wave-31): i18next + react-i18next + LocaleSwitcher + Intl formatters`

**Dependencies (locked, exact versions)**: `package.json` additions:

```json
"i18next": "^23.16.5",
"react-i18next": "^15.4.0",
"i18next-browser-languagedetector": "^8.0.2"
```

(These are the latest stable as of writing; if newer is available at execution time, prefer the newest stable that's React-19-compatible. Document the chosen versions in the PR description with a note about why if you deviate.)

**i18n initialization** — `src/shared/i18n/index.ts` (NEW):

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import es from './locales/es.json';

const NAMESPACES = ['common','auth','tasks','projects','library','dashboard','settings','notifications','errors'] as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en','es'],
    interpolation: { escapeValue: false }, // React handles XSS
    defaultNS: 'common',
    ns: [...NAMESPACES],
    resources: { en, es },
    detection: {
      order: ['localStorage','navigator'],
      lookupLocalStorage: 'planterplan.locale',
      caches: ['localStorage'],
    },
  });

export { i18n };
export const SUPPORTED_LOCALES = [
  { code: 'en' as const, label: 'English' },
  { code: 'es' as const, label: 'Español' },
];
```

**Provider wiring** — `src/app/App.tsx`. Wrap the existing provider tree with `<I18nextProvider>` between `QueryClientProvider` and `AuthProvider`:

```tsx
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/shared/i18n';

// Inside App():
<QueryClientProvider client={queryClient}>
  <I18nextProvider i18n={i18n}>
    <AuthProvider>
      <BrowserRouter>
        {/* … existing routes … */}
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  </I18nextProvider>
</QueryClientProvider>
```

**Locale switcher UI** — `src/features/settings/components/LocaleSwitcher.tsx` (NEW):

```tsx
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { SUPPORTED_LOCALES } from '@/shared/i18n';

export function LocaleSwitcher() {
  const { i18n, t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <label className="text-slate-700">{t('settings.profile.locale_label')}</label>
      <Select value={i18n.language} onValueChange={(code) => void i18n.changeLanguage(code)}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SUPPORTED_LOCALES.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
```

**Mount location** — `src/pages/Settings.tsx`, inside the existing **Profile** tab as a new row above the email-preferences toggle (or wherever the operator finds the most natural slot — read the file first; default to "between display name and email-preferences"). Don't mount in Notifications or Security.

**Intl formatters** — `src/shared/i18n/formatters.ts` (NEW). All display-time date/number/currency rendering goes through these:

```ts
import { i18n } from '@/shared/i18n';

const currentLocale = (): string => i18n.language || 'en';

/**
 * Locale-aware date formatter. WRAPS display only — date-engine still owns
 * internal date math (sorting, comparison, persistence, ISO parsing).
 *
 * @param iso ISO 8601 string from a `tasks` row (or null).
 * @param format 'short' (medium dateStyle), 'long' (full dateStyle), 'relative' ('3 days ago').
 */
export function formatDateLocalized(iso: string | null, format: 'short' | 'long' | 'relative'): string {
  if (!iso) return '';
  const d = new Date(iso); // boundary: ISO → Date for Intl
  if (isNaN(d.getTime())) return '';
  if (format === 'relative') {
    const rtf = new Intl.RelativeTimeFormat(currentLocale(), { numeric: 'auto' });
    const diffMs = d.getTime() - Date.now();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
    return rtf.format(Math.round(diffDays / 30), 'month');
  }
  return new Intl.DateTimeFormat(currentLocale(), {
    dateStyle: format === 'long' ? 'full' : 'medium',
  }).format(d);
}

export function formatNumberLocalized(n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(currentLocale(), opts).format(n);
}

export function formatCurrencyLocalized(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat(currentLocale(), { style: 'currency', currency }).format(n);
}
```

**JSDoc note**: this file is for *display*. `formatDisplayDate` in `src/shared/lib/date-engine/index.ts` keeps its UTC-anchored ISO contract for internal math. Don't conflate.

**TypeScript typing** — `src/shared/i18n/i18n.d.ts` (NEW):

```ts
import 'i18next';
import en from './locales/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: typeof en;
  }
}
```

This catches `t('typo.key')` at build time once Task 2 populates `en.json`.

**Architecture doc** — `docs/architecture/i18n.md` (NEW):

```md
# Localization (Wave 31)

## Stack
* `i18next@^23.16.5` + `react-i18next@^15.4.0` + `i18next-browser-languagedetector@^8.0.2`
* TypeScript module augmentation (`src/shared/i18n/i18n.d.ts`) types `t('key.path')` against `en.json`.

## Locale catalog (Wave 31)
* `en` — baseline, hand-authored.
* `es` — proof of pipeline; machine-translated; **human review pending** (see `docs/dev-notes.md`).

## File layout
* `src/shared/i18n/index.ts` — i18next init + supported-locale list.
* `src/shared/i18n/locales/en.json` — baseline strings, namespace-keyed.
* `src/shared/i18n/locales/es.json` — Spanish translation.
* `src/shared/i18n/formatters.ts` — `formatDateLocalized`, `formatNumberLocalized`, `formatCurrencyLocalized`.
* `src/shared/i18n/i18n.d.ts` — type augmentation.
* `src/features/settings/components/LocaleSwitcher.tsx` — Settings → Profile tab.

## Namespace structure
`common, auth, tasks, projects, library, dashboard, settings, notifications, errors`. Snake_case keys. Pluralization via i18next built-in (`_one`, `_other`).

## Date / number split
* **Display** (anything user-facing) → `formatDateLocalized` / `formatNumberLocalized` / `formatCurrencyLocalized` from `src/shared/i18n/formatters.ts`.
* **Math** (sorting, comparison, persistence) → `src/shared/lib/date-engine/index.ts` (UTC-anchored ISO; locale-agnostic).

## Switching the locale
Settings → Profile → LocaleSwitcher. Persisted to `localStorage.planterplan.locale`. Detector falls back to `navigator.language`, then `'en'`.

## Adding a new locale (post-Wave-31 translator workflow)
1. Copy `en.json` to `XX.json` (XX = ISO 639-1 code).
2. Translate; preserve interpolation (`{{count}}`) and pluralization keys (`_one`/`_other`).
3. Append `{ code: 'XX', label: 'Native Label' }` to `SUPPORTED_LOCALES` in `src/shared/i18n/index.ts`.
4. Import + add to `resources` in the same file.
5. Validation test (`Testing/unit/shared/i18n/XX-json.test.ts`) — copy from `es-json.test.ts`.
```

**Tests**:
* `Testing/unit/shared/i18n/formatters.test.ts` (NEW) — `formatDateLocalized` produces locale-correct output for `en` and `es`; `formatNumberLocalized` honors locale grouping; `formatCurrencyLocalized` produces the right symbol; null/invalid input returns empty string.
* `Testing/unit/features/settings/components/LocaleSwitcher.test.tsx` (NEW) — switching the locale persists to `localStorage`; downstream `t()` consumer re-renders with the new locale.

**DB migration?** No.

**Out of scope:** RTL support; per-project locale; locale-aware Master Library search.

---

### Task 2 — String extraction (en baseline)

**Commit (or per-namespace commits):** `chore(wave-31): extract every UI string to en.json`

The bulk-mechanical pass. Every user-visible English string in `src/` (in JSX and toast text, including `aria-label`s) moves into `src/shared/i18n/locales/en.json` and is replaced with `t('namespace.key')`.

**Discovery method (Sonnet-friendly):**
```bash
# Find candidate strings: text inside JSX, toast calls, aria-label/title attrs.
grep -rn '>[A-Za-z]' src/ --include='*.tsx' | grep -v 'className\|data-testid' | head -200
grep -rn 'toast\.\(success\|error\|info\|warning\)\(' src/ --include='*.tsx'
grep -rn 'aria-label="' src/ --include='*.tsx'
grep -rn 'placeholder="' src/ --include='*.tsx'
```

For each match, decide: is it user-visible English? If yes → extract. If it's a key, ID, className, or programmatic constant → leave.

**Conventions (locked):**
* **Namespace per domain**: `auth, tasks, projects, library, dashboard, settings, notifications, common, errors`.
* **Key naming**: `domain.section.element`. Examples:
  * `tasks.detail.related_tasks_heading` → `"Related Tasks"`
  * `tasks.form.title_label` → `"Title"`
  * `common.cancel` → `"Cancel"`
  * `errors.network_failed` → `"Network error. Please try again."`
* **Pluralization**: i18next built-in. `t('tasks.dispatch.shifted_count', { count: 5 })` reads from:
  ```json
  { "shifted_count_one": "{{count}} task rescheduled", "shifted_count_other": "{{count}} tasks rescheduled" }
  ```
* **Interpolation**: `{{varname}}` syntax.
* **Inline-only strings** (e.g., `aria-label`) **also extract**. No remaining English in JSX text or attribute values.

**Per-domain commits (within the same branch, for reviewability):**
1. `chore(wave-31): extract auth strings`
2. `chore(wave-31): extract tasks strings` (largest)
3. `chore(wave-31): extract projects strings`
4. `chore(wave-31): extract library strings`
5. `chore(wave-31): extract dashboard strings`
6. `chore(wave-31): extract settings strings`
7. `chore(wave-31): extract notifications strings`
8. `chore(wave-31): extract common + errors strings`

After each commit, the dev server must still produce a fully English UI (just less stringly-typed). Run `npm test` after each — most tests should still pass; some snapshot/text-content tests will need updating.

**Date and number rendering** — find every direct call to `formatDisplayDate` at *display sites* (JSX) and replace with `formatDateLocalized` from `@/shared/i18n/formatters`. Internal date math (sorting, comparison, persistence) stays on `formatDisplayDate` / `date-engine`.

```bash
grep -rn 'formatDisplayDate(' src/ --include='*.tsx' --include='*.ts'
```

For each call site: if it's inside a JSX text node or a string concatenation that lands in JSX, swap to `formatDateLocalized`. If it's inside a comparison or sort, leave.

**`en.json` validation** — `Testing/unit/shared/i18n/en-json.test.ts` (NEW):

```ts
import en from '@/shared/i18n/locales/en.json';

describe('en.json', () => {
  it('has every required namespace', () => {
    for (const ns of ['common','auth','tasks','projects','library','dashboard','settings','notifications','errors']) {
      expect(en).toHaveProperty(ns);
    }
  });

  it('no empty string values', () => {
    const walk = (obj: Record<string, unknown>, path: string[] = []) => {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'string') expect(v.length, `${[...path, k].join('.')}`).toBeGreaterThan(0);
        else if (v && typeof v === 'object') walk(v as Record<string, unknown>, [...path, k]);
      }
    };
    walk(en as Record<string, unknown>);
  });

  it('every plural key has _one and _other', () => {
    const walk = (obj: Record<string, unknown>) => {
      const keys = Object.keys(obj);
      for (const k of keys) {
        if (k.endsWith('_one')) {
          const stem = k.slice(0, -4);
          expect(keys).toContain(`${stem}_other`);
        }
        const v = obj[k];
        if (v && typeof v === 'object') walk(v as Record<string, unknown>);
      }
    };
    walk(en as Record<string, unknown>);
  });
});
```

**Test snapshot policy** — Wave 31 changes string sources, not behavior. For tests that assert exact text:
* **Re-snapshot** is the locked default — keeps tests readable. Run `npm test -- -u` once at the end of each per-domain extraction commit, review the snapshot diffs (they should differ only in being i18n-routed), then commit the updated snapshots.

**Lint rule** — adding `eslint-plugin-i18next` is **explicitly OUT OF SCOPE** for Wave 31 (too noisy on existing code). Wave 38 may revisit.

**DB migration?** No.

**Out of scope:** Translator tooling (Lokalise/Crowdin); RTL; localized email/PDF templates server-side; locale-aware fuzzy date parsing for inputs.

---

### Task 3 — Spanish locale (proof of pipeline)

**Commit:** `feat(wave-31): es.json — Spanish translation (machine-translated baseline; human review pending)`

**Translation source** — start from `en.json` and translate via DeepL or Google Translate. Machine-translated is acceptable for v1. **PR description must call this out** as machine-translated and request a human review pass before any "Spanish support" marketing claim.

**`_meta` marker at top of `es.json`**:

```json
{
  "_meta": {
    "status": "machine-translated; pending human review",
    "translator": "deepl",
    "review_required_before_marketing": true,
    "translated_against_en_version": "<commit sha of en.json at translation time>"
  },
  "common": { ... },
  "auth": { ... },
  // ... all other namespaces
}
```

**Wire into the locale switcher** — already done in Task 1's `SUPPORTED_LOCALES`. No additional change.

**Smoke pass** — flip the locale to `es` in the running app and walk every page (Dashboard, Reports, Project, Tasks, Settings, Login). Anything still rendering in English is a string Task 2 missed. **Backport to Task 2's branch and re-extract** before Task 3's PR can merge.

**Pluralization sanity** — pick three pluralized keys and confirm Spanish forms render correctly with `{ count: 0 }`, `{ count: 1 }`, `{ count: 5 }`. Spanish has the same `_one` / `_other` rule as English — straightforward.

**Tests** — `Testing/unit/shared/i18n/es-json.test.ts` (NEW). Mirrors `en-json.test.ts`:

```ts
import en from '@/shared/i18n/locales/en.json';
import es from '@/shared/i18n/locales/es.json';

describe('es.json', () => {
  it('has every namespace and key from en.json', () => {
    const walk = (a: Record<string, unknown>, b: Record<string, unknown>, path: string[] = []) => {
      for (const k of Object.keys(a)) {
        if (k === '_meta') continue;
        const fullPath = [...path, k].join('.');
        expect(b).toHaveProperty(k); // missing translation key
        if (typeof a[k] === 'object' && a[k] !== null) {
          walk(a[k] as Record<string, unknown>, b[k] as Record<string, unknown>, [...path, k]);
        }
      }
    };
    walk(en as Record<string, unknown>, es as Record<string, unknown>);
  });

  it('has _meta with review_required_before_marketing flag', () => {
    expect((es as Record<string, unknown>)._meta).toBeDefined();
    expect(((es as Record<string, unknown>)._meta as Record<string, unknown>).review_required_before_marketing).toBe(true);
  });
});
```

**DB migration?** No.

**Out of scope:** Other locales beyond `es`; locale-specific UI tweaks for overflow.

---

## Documentation Currency Pass (mandatory — before review)

`docs(wave-31): documentation currency sweep`. Operations:

1. **`spec.md`**:
   - §3.1: flip `[ ] **Localization** ...` → `[x]` with sub-bullet: `Framework + en baseline + es proof of pipeline (Wave 31). See docs/architecture/i18n.md.`
   - Bump header to `> **Version**: 1.16.0 (Wave 31 — Localization)`. Update `Last Updated`.

2. **`docs/AGENT_CONTEXT.md`** — add: `**i18n Framework (Wave 31)**: i18next + react-i18next; locale persisted in `localStorage.planterplan.locale`; switcher in Settings → Profile; display formatters in `src/shared/i18n/formatters.ts` (Intl-based); date-engine retains UTC math contract. en + es shipped (es is machine-translated; pending human review).`

3. **`docs/architecture/i18n.md`** is in (Task 1).

4. **`docs/architecture/date-engine.md`** — append: `**Wave 31:** display-time date formatting uses `formatDateLocalized` from `src/shared/i18n/formatters.ts`. Internal math stays UTC-anchored ISO strings here. Don't conflate the two.`

5. **`docs/dev-notes.md`** — add: `**Active:** `es.json` (Spanish) is machine-translated. Human review pending before marketing as "Spanish support". Wave 31.`

6. **`repo-context.yaml`**:
   - `wave_status.current: 'Wave 31 (Localization)'`, `last_completed: 'Wave 31'`, `spec_version: '1.16.0'`.
   - `wave_31_highlights:` namespaces, switcher location, dep versions, machine-translation caveat.

7. **`CLAUDE.md`**:
   - Tech Stack: add `i18next + react-i18next + i18next-browser-languagedetector`.
   - New "Localization" subsection: persistence key, namespace structure, "all UI strings must be in `en.json` after Wave 31 — no hard-coded English in JSX or attribute values."

Land docs as `docs(wave-31): documentation currency sweep`.

## Wave Review (mandatory — before commit + push to main)

1. **Locale persistence** — change locale → reload → still in the same locale. Open a private window → defaults to `en`.
2. **Date formatting consistency** — every visible date renders via `formatDateLocalized`. Grep: `grep -rn 'Intl.DateTimeFormat' src/` should return only `src/shared/i18n/formatters.ts`.
3. **No hardcoded English in JSX** — grep for common English words inside JSX text:
   ```bash
   grep -rEn '>(Cancel|Save|Submit|Delete|Edit|Add|Create|Loading|Error)<' src/ --include='*.tsx'
   ```
   should return zero hits. Fix any holdouts.
4. **es.json completeness** — `Testing/unit/shared/i18n/es-json.test.ts` is green; manual smoke per Task 3 surfaced no English remnants on any walked page.
5. **Bundle size** — `npm run build` size delta should add ~50–80 KB to the main bundle (i18next + react-i18next + locales). Verify in the build output.
6. **No FSD drift** — `shared/i18n/` is in `shared/`; `LocaleSwitcher` is in `features/settings/`.
7. **Test coverage** — every new file has a matching test mirror. Snapshot updates from Task 2 reviewed and committed.
8. **Test-impact reconciled** — `Testing/test-utils/render-with-providers.tsx` (NEW) wraps `<I18nextProvider>` with eagerly-imported en.json; every existing `renderWithQueryClient` call bulk-migrated to `renderWithProviders` BEFORE string extraction; snapshot diffs reviewed manually (no blind `-u`); no `it.skip`. Test count ≥ baseline + new tests.
9. **Lint + build + tests** — green per `.claude/wave-execution-protocol.md` §4 (HALT on any failure).

## Commit & Push to Main (mandatory — gates Wave 32)

After all three task PRs and the docs sweep merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npm test`.
2. The new commits: 3+ task commits (Task 2 may split into per-namespace commits) + 1 docs sweep on top of Wave 30.
3. `git push origin main`. CI green.
4. **Do not start Wave 32** until the above is true.

## Verification Gate (per task, before push)

**Every command below is a HALT condition per `.claude/wave-execution-protocol.md` §4. If any check fails, STOP. Wave 31 also requires the migration ordering in §3.2 of the protocol — build the i18n provider wrapper FIRST, migrate every existing test BEFORE string extraction, snapshot updates require manual diff review.**

```bash
npm run lint      # 0 errors required (≤7 pre-existing warnings tolerated). FAIL → HALT.
npm run build     # clean. FAIL → HALT.
npm test          # 100% pass rate; count ≥ baseline + new tests. FAIL → HALT.
git status        # clean
```

## Key references

- `CLAUDE.md` — conventions
- `.gemini/styleguide.md` — strict typing, FSD, no raw date math
- `docs/architecture/date-engine.md` — read before touching date-display sites
- i18next docs — `https://www.i18next.com/`
- react-i18next docs — `https://react.i18next.com/`
- TypeScript module augmentation pattern — see `https://www.i18next.com/overview/typescript`

## Critical Files

**Will edit:**
- ~every `.tsx` file in `src/` (Task 2 — string extraction; expect 50+ files)
- `src/app/App.tsx` — wrap in `<I18nextProvider>`
- `src/pages/Settings.tsx` — mount `<LocaleSwitcher>` in Profile tab
- `package.json` (3 new deps with versions)
- `docs/architecture/date-engine.md` (Intl/date-engine split note)
- `docs/AGENT_CONTEXT.md` (Wave 31 golden path)
- `docs/dev-notes.md` (Spanish review-pending entry)
- `spec.md` (flip §3.1, bump to 1.16.0)
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
- Translator tooling (Lokalise/Crowdin)
- Other locales beyond `es`
- RTL support
- Locale-aware Master Library search
- Localized email/PDF templates server-side
- `eslint-plugin-i18next no-literal-string` (Wave 38 maybe)
- Locale-aware date input parsing

## Ground Rules

TypeScript only; no `.js`/`.jsx` (the `public/sw.js` exception from Wave 30 stands); no barrel files; `@/` → `src/`, `@test/` → `Testing/test-utils`; **no raw date math** — Intl/date-engine split must be respected (Intl for display, date-engine for math); no direct `supabase.from()` in components; Tailwind utilities only (no arbitrary values, no pure black — slate-900/zinc-900); brand button uses `bg-brand-600 hover:bg-brand-700`; max subtask depth = 1; **three new deps allowed: `i18next`, `react-i18next`, `i18next-browser-languagedetector` — pinned per Task 1**; atomic revertable commits; build + lint + tests clean before every push; **Spanish translations are machine-translated and explicitly flagged as such — do not market as "Spanish support" until a human-review pass lands**.
