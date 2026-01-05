# Pull Request: Surgical Refactor & Technical Debt Cleanup (Jan 2026)

## 📋 Summary

This PR represents a major "Health & Hygiene" initiative for the codebase, addressing technical debt, hardening the database, and modernizing the development workflow.

### 🐛 Stability & Fixes

- **Optimistic Rollback**: Implemented a robust rollback mechanism in `useTreeState` to prevent UI/State desync when drag-and-drop operations fail.
- **Database Safety**: Added recursion guards (`pg_trigger_depth()`) to multiple triggers and idempotent checks to setup scripts to prevent crashes and infinite loops.
- **Dependency Audit**: Updated 24+ outdated packages (including `react-router-dom`, `uuid`) to modernize `package-lock.json`.

### 🏗️ Architecture & Refactoring

- **"God Component" Decomposition**: Extracted complex tree logic from `MasterLibraryList.jsx` into a dedicated `useTreeState` hook, decoupling UI rendering from state management.
- **Magic Strings**: Eliminated brittle hardcoded strings ('todo', 'in_progress') by introducing centralized `TASK_STATUS` constants in `src/constants/index.js` and propagating them across components and tests.
- **Database Consolidation**: Merged 3 standalone migration files into the canonical `docs/db/schema.sql` and `docs/db/one_time_setup.sql` for a single source of truth.

### 🤖 Agent & Developer Experience

- **Agent Configuration**: Overhauled `.agent/` directory with new Workflows (`pre-pr-docs`, `auto-roadmap`, `debt-audit`) and Rules to standardize AI assistant behavior.
- **Documentation**: Consolidated fragmented Test Plans into `testing-strategy.md` and merged Architecture rules into `ENGINEERING_KNOWLEDGE.md`.
- **Debt Report**: Completed a comprehensive `DEBT_REPORT.md` audit, closing out multiple high-priority items.

## 🗺️ Roadmap Progress

| Item ID | Feature Name | Phase | Status | Notes |
| ------- | ------------ | ----- | ------ | ----- |
| **P5-TREE-PERF** | Recursive Tree Optimization | 5 | ✅ Done | Refactored `MasterLibraryList` to use strict effect-based syncing. |
| **P5-TECH-DEBT** | Tech Debt Resolution | 5 | ✅ Done | Modularized Master Library logic and updated dependencies. |
| **P5-OPT-ROLLBACK**| Optimistic Rollback | 5 | ✅ Done | Implemented `previousStatus` capture and revert logic. |

## 🏗️ Architecture Decisions

### Key Patterns & Decisions

- **Pattern A (Facaded Hooks):** Extracted `useTreeState` to separate "Loading/Expansion" logic from "Rendering".
- **Pattern B (Safe Migrations):** Refactored `one_time_setup.sql` to use `DO $$` blocks with column existence checks, ensuring scripts are safe to run on both fresh and existing databases.
- **Pattern C (Agent Workflows):** Formalized common dev tasks (roadmap updates, pre-pr docs) into `.agent/workflows/` to ensure consistency.

### Database Changes [`docs/db/`]

- **`schema.sql`**: Added `clone_project_template` (RPC), `calc_task_date_rollup` (Trigger), and updated RLS policies for `storage.buckets`.
- **`one_time_setup.sql`**: Added idempotent storage bucket configuration and conditional cleanup logic.

## 🔍 Review Guide

### 🚨 High Risk / Security Sensitive

- `package-lock.json` - Significant updates to internal dependencies.
- `src/hooks/useTreeState.js` - New core logic for the Master Library tree view.
- `docs/db/schema.sql` - Core database definition changes.

### 🧠 Medium Complexity

- `.agent/` directory - New rules and workflows for AI context.
- `src/components/organisms/MasterLibraryList.jsx` - Significant code deletion (moved to hook).
- `src/constants/index.js` - New centralized constants.

### 🟢 Low Risk / Boilerplate

- `DEBT_REPORT.md` - Status updates.
- `docs/operations/` - Documentation consolidation.

## 🧪 Verification Plan

### 1. Environment Setup

- [ ] Run `npm install` (to sync new lockfile versions)

### 2. Manual Verification

- **Dependency Check**:
    1. Run `npm test` -> All tests must pass.
    2. Run `npm run build` -> Build must succeed without lint errors.
- **Master Library**:
    1. Go to "Master Library".
    2. Expand a task.
    3. Verify children load and appear.
    4. Collapse and Expand again (should be instant).
- **Database Setup (Dry Run)**:
    1. Review `docs/db/one_time_setup.sql` logic.
    2. (Optional) Run against a local dev instance to ensure no errors.

### 3. Automated Tests

```bash
npm test -- src/components/organisms/MasterLibraryList.test.jsx
npm run lint
```
