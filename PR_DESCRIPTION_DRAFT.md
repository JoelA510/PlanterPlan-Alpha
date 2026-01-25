# Description

## Summary of Changes
- **Removed Budgeting Feature**: Deleted all frontend components, services, and database tables related to Budgeting.
- **Removed Inventory Feature**: Deleted all frontend components, services, and database tables related to Inventory/Assets.
- **Database Cleanup**: Added migration `20260125_remove_budget_inventory.sql` to drop `budget_items` and `assets` tables and updated `schema.sql`.
- **Documentation Update**: Updated README, Roadmap, and Agent Context to reflect the removal of these features.

## Roadmap Progress

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Budgeting Lite** | 🗑️ **Removed** | Feature was de-prioritized and removed. |
| **Inventory/Assets** | 🗑️ **Removed** | Feature was de-prioritized and removed. |

## Architecture Decisions
- **Feature Removal**: Decided to perform a hard delete of the features rather than deprecating them code-side, to keep the codebase lean.
- **Database Migration**: Used a destructive migration (`DROP TABLE`) to ensure the database schema matches the codebase state.
- **Safe Rollback**: The implementation plan includes a rollback SQL script if we need to restore the tables (data would be lost unless backed up, but schema is recoverable).

## Review Guide

| File Category | Risk | Notes |
| :--- | :--- | :--- |
| **Migrations** | 🔴 **High** | `supabase/migrations/20260125_remove_budget_inventory.sql` drops tables. |
| **Schema Docs** | 🟡 **Medium** | `docs/db/schema.sql` modified to remove definitions. |
| **Frontend Root** | 🟡 **Medium** | `src/pages/Project.jsx` and `project.js` constants modified to unlink features. |
| **Deleted Features** | 🟢 **Low** | `src/features/budget` and `src/features/inventory` deleted. |

## Verification Plan

### Automated Tests
- `npm run build`: Verified successful build with no missing import errors.
- `npm run lint`: Verified no linting errors related to missing components.

### Manual Verification
1. **Project Dashboard**: Verified "Budget" and "Inventory" tabs are gone from the Project view.
2. **Database Integrity**: Verified `schema.sql` and `seed_recovery.sql` have no broken functional references.
3. **Agent Context**: Verified `docs/AGENT_CONTEXT.md` no longer lists the removed domains.
