# Date Calculation Ownership

This document clarifies responsibility for date-related calculations in the application.

## Summary

| Field                                     | Calculated By    | Location                 |
| ----------------------------------------- | ---------------- | ------------------------ |
| `days_from_start`                         | Client (UI)      | `useTaskOperations.js`   |
| `start_date` / `due_date` (parent rollup) | Database Trigger | `calc_task_date_rollup`  |
| `start_date` / `due_date` (on clone)      | Database RPC     | `clone_project_template` |

## Details

### 1. `days_from_start`

- **Owner**: Client (Frontend)
- **Logic**: Calculated in `useTaskOperations.js` when creating or updating tasks
- **Reason**: Business logic for relative date offsets is UI-driven

### 2. Parent Date Rollup

- **Owner**: Database (Trigger)
- **Trigger**: `trigger_calc_task_dates` on `tasks` table
- **Logic**: When a child task's dates change, the trigger updates the parent's `start_date` (min) and `due_date` (max)
- **Reason**: Ensures data consistency at the DB level, avoiding race conditions

### 3. Clone Operations

- **Owner**: Database (RPC)
- **RPC**: `clone_project_template`
- **Logic**: Accepts `p_start_date` and `p_due_date` for the root task only
- **Reason**: Atomic single-transaction cloning with date overrides

## Anti-Patterns to Avoid

1. **Do NOT** calculate parent rollups in the client - let the trigger handle it
2. **Do NOT** update dates after clone - pass them to the RPC via overrides
3. **Do NOT** rely on client-side re-fetch to sync dates - triggers update in-place
