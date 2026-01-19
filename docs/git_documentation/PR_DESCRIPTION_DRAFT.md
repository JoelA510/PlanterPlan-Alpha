# Feature: Time Management, Task Dependencies & Architecture Refactor

## Summary
This release introduces comprehensive time management capabilities, including task dependencies and project-level configurations, while significantly hardening the codebase through extensive refactoring and standardization.

## Key Features

### 1. Time Management & Dependencies
- **Task Dependencies**: Implemented blocking and relational dependencies (`blocks`, `relates_to`) with a new `task_relationships` table.
- **Date Logic**: Enhanced date inheritance engine to better handle project start/end date cascades.
- **Project Settings**: Added "Due Soon" thresholds and Location settings via a JSONB `settings` column.

### 2. Architecture & Performance
- **Data Hook Pattern**: Migrated `Project.jsx` to use a dedicated `useProjectData` hook, decoupling view logic from data fetching.
- **Component Decomposition**:
  - Split `TaskItem.jsx` (previously huge) into modular `TaskStatusSelect` and `TaskControlButtons`.
  - Refactored `Reports.jsx` to use reusable chart components (`StatusPieChart`, `PhaseBarChart`).
  - Refactored `Settings.jsx` to use configuration-driven UI generation.
- **Real-time Optimization**: Fixed query invalidation strategies in `useTaskSubscription` to prevent over-fetching.

### 3. Code Quality & Standards
- **Type Safety**: Enforced `PropTypes` across 10+ core Shared UI components (`Button`, `Input`, `Dialog`, etc.) and key feature components.
- **Error Handling**: Standardized error reporting in `LoginForm` and `Settings` using the Toast system.
- **Documentation**: Added JSDoc to critical utilities including `planterClient`, `date-engine`, and `export-utils`.
- **Testing**: Added unit test coverage for complex date logic (`date-engine`) and API adapters (`planterClient`).
- **Hygiene**: Achieved zero lint errors and removed all production console logging.
- **Optimization**: Deleted 4 dead CSS files (`buttons.css`, `forms.css`, etc.) to reduce codebase bloat.
- **Agentic Readiness**: Added `docs/AGENT_CONTEXT.md` to accelerate future AI-driven development.

## Database Changes
- **New Tables**: `task_relationships`
- **New Columns**: 
  - `tasks`: `assignee_id` (UUID), `priority` (Text), `is_premium` (Boolean)
  - `projects`: `settings` (JSONB)
- **Fixes**: Applied schema repairs to ensure local and remote environments match.

## Verification
- **Automated Tests**: Passed `npm test` for new logic.
- **Linting**: Passed `npm run lint` with 0 errors.
- **Manual QA**: verified Project Creation, Task Dependency UI, and Settings persistence.

## Dependencies
- `@tanstack/react-query` (Optimization)
- `lucide-react` (Icon standardization)
