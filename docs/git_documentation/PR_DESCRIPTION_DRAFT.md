# PR Description: Audit Implementation Phase 1

## Summary
This PR implements the first batch of high-priority recommendations from the Application Audit. It focuses on improving the "First-Time User Experience" (Onboarding), enhancing core utility (Command Palette, Budgeting), and stabilizing the codebase (Migration Consolidation).

## Key Changes

### 🚀 New Features
- **Onboarding Wizard**: A 3-step modal flow for new users to set up their first project (Name, Role, Template).
- **Getting Started Widget**: A dashboard checklist that guides users through initial setup tasks.
- **Budgeting Lite**: A new Project Widget allowing users to track expenses against a budget.
- **Global Command Palette**: Accessible via `Ctrl+K`, allowing quick navigation and project search.

### 🛠 Improvements
- **User Settings**: Completely refactored `Settings.jsx` to support Profile updates (Avatar, Name, Role) and Email Preferences.
- **Schema Consolidation**: squashed multiple migration files into `20260118_consolidated_schema.sql` to ensure a clean, idempotent DB state.

### 🧹 Tech Debt & Cleanup
- Removed unused placeholder components in Settings.
- Standardized `project_members` RLS policies.

## Verification Plan

### Automated
- [ ] Run `npm test` to verify `BudgetWidget` and `Settings` unit tests.

### Manual
1. **Onboarding**: Create a new account (or clear projects). Verify the Wizard appears. Complete it and check if the project is created.
2. **Budgeting**: Go to a Project. Add a budget item. Verify the progress bar updates.
3. **Command Palette**: Press `Ctrl+K`. Search for a project. Click to navigate.
4. **Settings**: Change your Avatar URL and Name. Refresh to verify persistence.

## Roadmap Impact
| Feature | Status |
| :--- | :--- |
| Onboarding Wizard | ✅ Done |
| Budgeting Lite | ✅ Done |
| User Profile | ✅ Done |
