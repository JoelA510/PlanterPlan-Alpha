# PR: Infrastructure Modernization (Vite + FSD Refactor)

## Summary

This PR completes the "Phase 10: Infrastructure Modernization" roadmap item. It migrates the codebase from Create React App (CRA) to Vite, replaces Jest with Vitest, and re-architects the folder structure to follow Feature-Sliced Design (FSD). This creates a deterministic environment optimized for both human developers and AI agents.

## Highlights

- **🚀 Vite Migration**: Dev server startup time reduced from ~15s to <300ms.
- **🏗️ Feature-Sliced Design**: Codebase organized into `App`, `Features`, and `Shared` layers for clear domain isolation.
- **⚡ Date Engine**: Centralized 100% of date logic into `src/shared/lib/date-engine`, eliminating 5+ regression risks.
- **🧪 Test Suite**: All tests migrated to Vitest, fixing ESM mocking issues and achieving a 100% pass rate.
- **🎨 Tailwind v4**: Upgrade to Tailwind v4 alpha, removing 600+ lines of manual CSS.

## Roadmap Progress

| Item | Status | Notes |
| :--- | :----- | :---- |
| **P10.1 Build System** | ✅ Done | CRA -> Vite |
| **P10.2 Testing** | ✅ Done | Jest -> Vitest |
| **P10.3 CSS** | ✅ Done | Tailwind v4 Implemented |
| **P10.4 Refactor** | ✅ Done | FSD Architecture |

## Architecture Decisions

### Feature-Sliced Design

We moved from a layer-based structure (`components/`, `hooks/`) to a domain-based structure:

- `src/features/{domain}`: Contains all logic + UI for a feature (e.g., `tasks`, `projects`).
- `src/shared`: Utilities and UI components with NO business logic.
- `src/app`: Wiring, routing, and providers.

### The Date Engine

To prevent "Date Math" regressions, we extracted all logic into `src/shared/lib/date-engine`.

- **Constraint**: No component is allowed to do direct `new Date()` manipulation.
- **Benefit**: Pure functions are now tested in isolation with fast unit tests.

## Review Guide

| Risk | Files | What to look for |
| :--- | :---- | :--------------- |
| 🔴 **High** | `vite.config.js`, `src/features/tasks/services/taskService.js` | Ensure build settings and core task logic (TaskService) mimic legacy behavior exactly. |
| 🟡 **Medium** | `src/shared/lib/date-engine/index.js` | Verify the extracted date logic covers all edge cases. |
| 🟢 **Low** | `src/styles/globals.css`, `*/*.test.js` | CSS cleanup and test syntax updates. |

## Verification Plan

### Automated

```bash
npm install
npm test # Expect 33/33 passed
npm run build # Expect success
```

### Manual Smoke Test

1. **Startup**: Run `npm run dev`. Verify instant load.
2. **Dashboard**: Navigate to a Project. Verify drag-and-drop works.
3. **Dates**: Open a Task. Verify "Due Date" works and respects UTC.
4. **Theme**: Verify brand colors (Orange) appear correctly.
