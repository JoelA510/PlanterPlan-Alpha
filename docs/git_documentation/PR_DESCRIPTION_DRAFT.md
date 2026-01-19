# PR Description: People/CRM Lite & Project Tabs

## Summary
- **Implemented People CRM**: Added full CRUD capabilities for managing project team members and "People" entities distinct from Auth users (volunteers, contacts).
- **Tabbed Project View**: Refactored `Project.jsx` to support "Task Board", "People", and "Budget" tabs, reducing clutter.
- **Missing Hooks**: Added `useUserProjects` to aggregate owned and joined projects properly.
- **Implemented Checkpoints**: Tasks now have an `is_locked` visual state.
- **Inventory Tracker**: Added `assets` table and management UI.
- **Mobile Field Mode**: Added FAB for quick actions and Mobile Agenda widget.
- **Master Review**: Ran Debt Audit, fixed `GettingStartedWidget` logic, and resolved UI regression in `Project.jsx`.
- **Test Coverage**: Added unit tests for `PhaseCard` (Checkpoints), `AssetList` (Inventory), and `MobileAgenda` (Mobile).

## Roadmap Progress

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **People/CRM Lite** | ✅ Done | Full service + UI flow. |
| **Budgeting Lite** | ✅ Done | Integrated into Budget Tab. |
| **Project Nav** | ✅ Done | Tabbed interface implemented. |
| **Checkpoints** | ✅ Done | UI Logic + Test Coverage. |
| **Inventory** | ✅ Done | Assets Tab + Service. |
| **Mobile Mode** | ✅ Done | FAB + Agenda Widget. |

## Architecture Decisions
- **Checkpoints**: Relying on db trigger for logic, UI for feedback.
- **Inventory**: New `assets` table with RLS linked to `project_members`.
- **Mobile**: Conditional rendering in Layout (`md:hidden`) to avoid desktop clutter.
- **Imports**: Fixed several relative import issues by enforcing absolute aliases (`@features/`, `@app/`).
- **Context**: Ensured `AuthContext` is correctly consumed in new hooks.

## Review Guide
- **High Risk**: `src/pages/Project.jsx` (Major refactor of layout/logic).
- **Medium Risk**: `src/features/people/services/peopleService.js` (New service).
- **Low Risk**: `src/features/budget/*` (Component tweak).

## Verification Plan
1. **Automated**:
   - `npm run build` (Passed)
   - `npm test src/features/people/components/PeopleList.test.jsx` (Passed)
   - `npm test src/features/budget/components/BudgetWidget.test.jsx` (Passed)
2. **Manual**:
   - Go to Project -> Click "People" tab -> Add Person -> Verify list updates.
   - Go to Project -> Click "Budget" tab -> Add Expense -> Verify widget updates.
