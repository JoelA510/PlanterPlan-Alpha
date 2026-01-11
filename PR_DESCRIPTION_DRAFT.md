# 🚀 Feature: Vite & Tailwind v4 Infrastructure Migration

## 📋 Summary
This PR executes a massive infrastructure modernization, migrating the entire codebase from Create React App (Webpack 5) to **Vite** and upgrading from Tailwind CSS v3 to **Tailwind CSS v4**. It also integrates the **Planter** feature set (Premium Dashboard, Projects, Reports) into the main application structure, hybridizing legacy features with new architectural patterns.

> [!IMPORTANT]
> **Scale:** **154 files changed**, **10,436 insertions**, **20,200 deletions**. This is a foundational rewrite of the build system + significant directory/layout rewiring.

## ✨ Highlights
- **🚀 CRA -> Vite** -> modern dev/build pipeline; CRA removed.
- **🧪 Jest -> Vitest** -> Vite-native testing with `jsdom` + `src/setupTests.js` (`@testing-library/jest-dom`).
- **🏗️ FSD adoption** -> clear layering via `src/app`, `src/features`, `src/shared` (ownership boundaries enforced by structure + imports).
- **⚡ Date Engine** -> `src/shared/lib/date-engine` as the single place for parsing/formatting/scheduling math (reduces UTC/local drift).
- **🎨 Tailwind CSS v4** -> Vite plugin (`@tailwindcss/vite`) + CSS-first theming via `@theme`; tokenized `brand-*` + `slate-*`.
- **🔀 Alias strategy** -> upstream aliases (`@app/@features/@shared/...`) plus compatibility aliases (`components/pages/utils/...`) to reduce migration thrash.
- **📦 Feature convergence** -> Feature pages (Dashboard/Projects/Reports) integrated; app wiring updated for query-driven data fetching.
- **🧭 Layout hardening** -> `DashboardLayout` owns navigation state to prevent "missing sidebar/naked page" regressions; responsive behavior stabilized.
- **🧹 Hygiene + remediation** -> lint blockers resolved; known React antipatterns/race triggers addressed; docs/.agent standards refreshed.

## 👥 User & Business Impact

| **Area** | **Improvement** | **Benefit** |
| :-- | :-- | :-- |
| **Developer Velocity** | Vite dev/build pipeline | Faster iteration cycles; less tooling friction |
| **Reliability** | Centralized date logic + layout/state hardening | Fewer regressions (UTC drift, sidebar wiring failures) |
| **Consistency** | Tokenized design system (`brand-*`, `slate-*`) | Eliminates inconsistent colors/styles across screens |
| **Maintainability** | FSD boundaries + alias strategy | New features land with clearer ownership and lower coupling |

## 🛣️ Roadmap Progress

| Status | ID | Feature | Description |
| :--- | :--- | :--- | :--- |
| ✅ | **INFRA-VITE** | Vite Migration | Migrate from CRA to Vite for faster HMR & Builds |
| ✅ | **INFRA-TW4** | Tailwind v4 | Upgrade to Tailwind v4 with CSS-native config |
| ✅ | **FE-PLANTER** | Planter Integration | Merge Premium features (Dashboard, Projects) |
| ✅ | **UX-NAV** | Responsive Navigation | Fix Sidebar mobile interactions and persistence |

## 🏗️ Architecture Decisions

### 1) Build + Test Toolchain: Vite + Vitest
- **What changed**
  - `vite.config.js` added (React + Tailwind v4 via `@tailwindcss/vite`)
  - **Build output** preserved via `build.outDir = "build"` (minimizes deploy pipeline churn)
  - Vitest configured with **`jsdom`** + **`src/setupTests.js`**
- **Why**
  - CRA constraints and slower feedback loops; Vite aligns with modern ESM-first workflows.

### 2) FSD Structure: `src/app`, `src/features`, `src/shared`
- **`src/app`** -> routing/providers/composition (application wiring)
- **`src/features/{domain}`** -> domain UI + state + services
- **`src/shared`** -> reusable UI/utilities (no domain business logic)

### 3) Styling: Tailwind CSS v4 + CSS-first theme tokens
- Tailwind v4 configured via **CSS-first** approach (`@theme`) rather than a heavy `tailwind.config.js`.
- Design tokens centralized in `src/styles/globals.css` (theme "truth"):
  - `--color-brand-*`, `--color-slate-*`
- Migration included systematic class updates (e.g., legacy blue -> `brand-*`) and removal/reduction of overrides.

### 4) Date Engine: centralized date handling
- **Location** -> `src/shared/lib/date-engine`
- **Policy** -> date parsing/formatting/schedule math goes through the engine to prevent off-by-one/UTC drift issues.
- **Tests** -> baseline unit coverage added (Vitest).

### 5) App wiring for Premium pages
- `src/main.jsx` now composes core providers (notably `@tanstack/react-query` `QueryClientProvider`) to support query-driven data flows.

## 🧹 Code Quality Refactors
- **Component Layout**: Extracted `GlobalNavItem` from `SideNav.jsx` for modularity.
- **Service Layer**: Decoupled Project Seeding logic into `src/features/projects/services/projectService.js`.
- **Hook Optimization**: Deduplicated context-refresh logic in `useTaskMutations` hook.
- **CSS Hygiene**: Enforced `globals.css` as Single Source of Truth by removing conflicting `@theme` tokens from `index.css`.
- **Docs + agent standards**: Updated `.agent` prompts/rules and engineering knowledge to match new architecture/tooling.

## 🔍 Review Guide

| **Risk** | **Files / Areas** | **What to look for** |
| :-- | :-- | :-- |
| 🔴 **High** | `package.json`, `vite.config.js`, `src/main.jsx` | Toolchain parity, alias correctness, provider wiring, deploy compatibility (`outDir=build`) |
| 🔴 **High** | Routing/layout composition (`src/app`, `src/layouts`) | Sidebar ownership, route correctness, regression on core navigation |
| 🟡 **Medium** | `src/shared/lib/date-engine/**` | UTC/local invariants, call-site compliance, test coverage |
| 🟡 **Medium** | Feature pages (`src/pages/**`, navigation-driven client usage) | Data loading paths, query caching behavior, error/loading states |
| 🟢 **Low** | `src/styles/globals.css`, `src/shared/ui/**`, UI wrappers | Token usage, low-risk UI refactors, class name normalization |
| 🟢 **Low** | `.agent/**`, docs updates | Standards alignment; no runtime impact |

## 🧪 Verification Plan

### Automated
```bash
npm install
npm run lint
npm run test
npm run build
```

### Manual Smoke Test (Browser)
1. **Startup** -> `npm run dev` -> app loads, no console errors.
2. **Dashboard** -> `/dashboard` renders with sidebar; navigation persists across page changes.
3. **Reports** -> charts/widgets load; sidebar state remains consistent.
4. **Mobile** -> <1024px: hamburger toggles sidebar overlay; no horizontal scroll.
5. **Dates** -> task due/start dates display correctly; no "yesterday" off-by-one behavior.

---
*Generated by Antigravity via Master Review Orchestrator*
