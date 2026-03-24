# E2E Testing Strategy — PlanterPlan

## Overview

PlanterPlan uses a **dual-assertion E2E testing strategy** combining:
1. **DOM-based assertions** via Playwright selectors (fast, precise)
2. **Vision-based assertions** via Gemini 3 Flash API (resilient to DOM changes, catches visual regressions)

Tests are authored in **BDD Gherkin** using `playwright-bdd` and executed via Playwright.

## Selector Hierarchy

When writing selectors in Page Object Models, follow this priority order:

| Priority | Selector Type | Example | When to Use |
|----------|--------------|---------|-------------|
| 1 | `getByRole()` | `getByRole('button', { name: /save/i })` | Buttons, links, headings, form elements |
| 2 | `getByLabel()` / `getByText()` | `getByLabel(/email/i)` | Form inputs, text content |
| 3 | `getByPlaceholder()` | `getByPlaceholder(/search/i)` | Search inputs, text fields |
| 4 | `[data-testid="..."]` | `locator('[data-testid="stats-card"]')` | Custom components, repeated elements |
| 5 | ARIA attributes | `locator('[role="dialog"]')` | Dialogs, switches, tabs |
| **NEVER** | CSS classes | ~~`.animate-spin`~~, ~~`.text-red-500`~~ | Tailwind classes change frequently |
| **NEVER** | Complex CSS | ~~`button:has(svg)`~~, ~~`#el ~ p.class`~~ | Fragile to DOM restructuring |

### Key Rules
- **Always prefer semantic selectors** (role, label, text) over structural ones
- **Add `data-testid`** to components that lack semantic anchors
- **Add `aria-label`** to icon-only buttons so `getByRole('button', {name})` works
- **Scope selectors** to parent containers: `dialog.getByRole('button')` not `page.locator('button')`
- **Use `.or()` fallbacks** for resilience: `locator('[data-testid="x"]').or(page.getByRole(...))`

## Vision-Based Testing

### When to Use Vision Assertions
- **Pillar tests** (critical 80/20 journeys) — dual DOM + vision assertions
- **Visual regression detection** — layout, component visibility, responsive behavior
- **New page/feature validation** — verify visual completeness before writing precise DOM assertions

### When NOT to Use Vision Assertions
- Simple existence checks (`toBeVisible()` is faster and more reliable)
- Exact value assertions (text content, counts, form values)
- CI performance-sensitive tests (vision adds ~2-5s per check)

### Architecture
```
e2e/helpers/
├── vision.ts          — Gemini API integration (screenshot → prompt → JSON result)
├── vision-prompts.ts  — Structured prompt templates per page/component
└── visual.ts          — Screenshot pixel comparison (existing, complementary)

e2e/steps/
└── vision.steps.ts    — BDD step definitions for vision assertions
```

### Environment
- `GEMINI_API_KEY` — Required for vision assertions (gracefully skipped if absent)
- Vision checks are **non-blocking in CI by default** — they warn but don't fail if API key is missing

## Test Architecture

### File Structure
```
e2e/
├── features/           ← Gherkin .feature files (organized by domain)
│   ├── auth/
│   ├── dashboard/
│   ├── project/
│   ├── tasks/
│   ├── navigation/
│   ├── reports/
│   ├── settings/
│   ├── team/
│   ├── library/
│   ├── mobile/
│   ├── home/
│   ├── error-states/
│   ├── accessibility/
│   ├── pillar-tests/
│   ├── daily/
│   ├── form-validation/
│   └── onboarding/
├── steps/              ← Step definitions (.steps.ts) — glue between features and POMs
├── pages/              ← Page Object Models
│   └── components/     ← Component-level POMs
├── fixtures/           ← Test fixtures and test data
├── helpers/            ← Utility functions (wait, toast, vision, visual)
└── .auth/              ← Pre-authenticated browser states (gitignored)
```

### Adding a New Test

1. **Create feature file** in `e2e/features/<domain>/<feature>.feature`
2. **Add step definitions** in `e2e/steps/<domain>.steps.ts`
3. **Create POM** (if new page/component) in `e2e/pages/`
4. **Add `data-testid`** to source components if needed
5. **Run `npm run test:e2e`** to verify

### Naming Conventions
- Feature files: `kebab-case.feature`
- Step files: `kebab-case.steps.ts`
- POM files: `PascalCase.ts`
- Test IDs: `kebab-case` (e.g., `data-testid="task-details-panel"`)

## CI/CD Integration

```yaml
# .github/workflows/ci.yml
e2e:
  - npm ci
  - npx playwright install --with-deps chromium
  - npx supabase start
  - node scripts/seed-e2e.js
  - npm run test:e2e           # DOM-only (fast, ~5min)
  - npm run test:e2e:vision    # DOM + vision (optional, ~15min)
```

### Test Scripts
- `npm run test:e2e` — Standard E2E run (Playwright + BDD)
- `npm run test:e2e:mobile` — Mobile-specific tests (Pixel 7 viewport)
- `npm run test:e2e:headed` — Headed browser for debugging
- `npm run test:e2e:vision` — Vision-enhanced tests (requires GEMINI_API_KEY)

## Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Routes | 100% | 100% (7/7 + home page) |
| Core CRUD | 100% | 100% (tasks, projects, team, settings) |
| RBAC | 100% | 100% (all 5 roles tested) |
| Error handling | 90%+ | Network errors, form validation, empty states |
| Accessibility | Basic | Keyboard nav, heading hierarchy, ARIA roles |
| Mobile | Basic | Responsive layout, FAB, agenda |
| Vision | Pillar tests | Dashboard, project, tasks, settings, home |
| Realtime | Basic | Task updates, reconnection |

## Role-Based Test Users

| Role | Email | Auth State File |
|------|-------|-----------------|
| Primary | test@example.com | `e2e/.auth/user.json` |
| Owner | owner@example.com | `e2e/.auth/owner.json` |
| Editor | editor@example.com | `e2e/.auth/editor.json` |
| Viewer | viewer@example.com | `e2e/.auth/viewer.json` |
| Limited | limited@example.com | `e2e/.auth/limited.json` |
| Coach | coach@example.com | `e2e/.auth/coach.json` |
