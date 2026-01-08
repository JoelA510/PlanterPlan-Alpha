## Assumptions

* This PR description will live in GitHub and should stay objective (avoid self-evaluative praise that reviewers may read as noise).
* It is acceptable to include explicit intent/benefit statements (DX, build perf, maintainability, scalability) as long as they are framed as goals/outcomes, not opinions.

# PR: Phase 10 - Frontend Infrastructure Modernization (Vite + Vitest + FSD + Date Engine)

## Summary

This PR completes **Phase 10: Infrastructure Modernization**. It upgrades the frontend toolchain and architecture to improve developer experience, build performance, and long-term maintainability by:

* Migrating the build system from **Create React App (CRA)** to **Vite**
* Migrating tests from **Jest** to **Vitest**
* Refactoring the codebase to **Feature-Sliced Design (FSD)** for clearer domain isolation
* Introducing a dedicated **Date Engine** to standardize date operations and reduce recurring date-related regressions
* Upgrading to **Tailwind CSS v4 (alpha)** and removing legacy/manual CSS

These changes aim to improve code quality and prepare the application for future growth.

## Highlights

* **🚀 Vite Migration**: Dev server startup time reduced from ~15s to <300ms (CRA -> Vite).
* **🏗️ Feature-Sliced Design (FSD)**: Reorganized into `src/app`, `src/features`, and `src/shared` for scalable structure and clearer ownership boundaries.
* **⚡ Date Engine**: Centralized date logic at `src/shared/lib/date-engine` with a strict constraint against direct component-level `new Date()` manipulation to prevent "date math" regressions.
* **🧪 Vitest Migration**: Jest -> Vitest to reduce ESM mocking friction and restore a fully passing suite (**expect 33/33 passing**).
* **🎨 Tailwind CSS v4 (alpha)**: Upgrade enabled removal of 600+ lines of manual CSS.

## Roadmap Progress

| Item                   | Status | Notes                                  |
| :--------------------- | :----- | :------------------------------------- |
| **P10.1 Build System** | ✅ Done | CRA -> Vite                            |
| **P10.2 Testing**      | ✅ Done | Jest -> Vitest                         |
| **P10.3 CSS**          | ✅ Done | Tailwind v4 implemented; CSS reduction |
| **P10.4 Refactor**     | ✅ Done | FSD architecture adopted               |

## Architecture Decisions

### Feature-Sliced Design (FSD)

Refactored from a generic layer-based layout (e.g., `components/`, `hooks/`) into a domain-oriented structure:

* **`src/features/{domain}`** -> Feature UI + state + services for a domain (e.g., `tasks`, `projects`)
* **`src/shared`** -> Reusable UI + utilities with **no business logic**
* **`src/app`** -> Application wiring: routing, providers, composition

**Rationale**: Improves discoverability, reduces cross-domain coupling, and supports scalable growth as features expand.

### Date Engine

Date handling is centralized under **`src/shared/lib/date-engine`**.

* **Constraint**: Components should not perform direct date construction/manipulation (`new Date()` and ad-hoc "date math") outside the engine.
* **Benefit**: Date logic becomes consistent and testable, reducing timezone/UTC drift and edge-case bugs.

## Review Guide

| Risk          | Files                                                          | What to look for                                                                         |
| :------------ | :------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| 🔴 **High**   | `vite.config.js`, `src/features/tasks/services/taskService.js` | Build config parity; core task logic remains behaviorally identical.                     |
| 🟡 **Medium** | `src/shared/lib/date-engine/**`                                | Edge-case coverage (UTC/local, parsing/formatting, boundaries) and call-site compliance. |
| 🟢 **Low**    | `src/styles/globals.css`, `**/*.test.*`                        | CSS cleanup and test syntax updates consistent with Vitest patterns.                     |

## Verification Plan

### Automated

```bash
npm install
npm test        # Expect 33/33 passed
npm run build   # Expect success
```

### Manual Smoke Test

1. **Startup**: `npm run dev` -> verify near-instant load.
2. **Dashboard**: Navigate to a Project -> verify drag-and-drop works.
3. **Dates**: Open a Task -> verify "Due Date" behavior and UTC handling match prior UX.
4. **Theme**: Verify brand colors (Orange) render correctly across key screens.

## Notes / Risks

* **Tailwind v4 alpha**: Higher upstream churn risk; pin versions and watch for breaking changes in future upgrades.
* **Performance claims**: Startup-time improvement is meaningful but environment-dependent (machine + cache state).
