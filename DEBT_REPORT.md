# Debt Report
Date: 2026-01-20

## 1. Critical (Security/Crash)
- **Database Drift**: `public.people` table definition exists in `schema.sql` but is missing from the running Supabase instance (verified via Browser Agent 404/Error).
  - **Impact**: People management features are broken in Stage/Dev.
  - **Fix**: Run `supbabase db push` or apply `schema.sql` to the instance.

## 2. Correctness
*(None identified - Source code is free of `any`, `console.log`)*

## 3. Maintainability
- **File**: `docs/specs/`
  - **Evidence**: Empty directory.
  - **Violation**: Zombie directory cluttering structure.
  - **Fix**: Delete directory.

- **File**: `docs/db/drafts/future_checkpoint_feature.sql`
  - **Evidence**: file exists.
  - **Violation**: Stale feature branch artifact in main documentation.
  - **Fix**: Delete.

## 4. Documentation Debt
*(None critical)*
