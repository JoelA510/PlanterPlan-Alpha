# PR #15 Review Fixes Summary

This document outlines the technical changes implemented to address the code review and security audit of PR #15.

## 1. Database & Security Hardening (Critical)

**Goal**: Fix recursion, privilege escalation, and visibility bugs.

- **Schema Optimization (`root_id`)**:
  - **Change**: Added `root_id` column to `tasks` table and a `maintain_task_root_id` trigger.
  - **Why**: Replaced recursive RLS policies (which caused infinite loop errors) with O(1) indexed lookups.
- **RLS Policy Rewrite (`docs/db/policies.sql`)**:
  - **SEC-01 (Templates)**: Added explicit `SELECT` policy for `origin = 'template'`.
  - **SEC-02 (Escalation)**: Split `INSERT` policies. Child task creation now restricts `creator` rights and tightly checks project membership.
  - **BUG-01 (Visibility)**: Fixed "Your Projects" visibility by ensuring creators can always see their root tasks.
  - **ADM-01 (Admin)**: Added `is_admin()` placeholder to allow administrative override.

## 2. Membership & Backend Integrity

**Goal**: ensure reliability of invites and timestamps.

- **Idempotency (SEC-05)**:
  - Updated `inviteMember` to use `upsert` instead of `insert`. Prevents duplicate key errors on re-invites.
- **Timestamp Trust (SEC-04)**:
  - Removed client-side `joined_at` generation. `project_members` now defaults to `NOW()` in the database.

## 3. UI/UX Improvements

**Goal**: Reduce friction and provide better feedback.

- **Validation (UX-01)**:
  - Added strict UUID regex validation to `InviteMemberModal` to prevent bad inputs.
- **Feedback (UX-04)**:
  - Added a 1.5s delay on success to allow the "Invitation sent!" message to be read before the modal closes.
- **Visibility (UX-03)**:
  - Updated `TaskList` to ensure "Invite" button appears for Project Creators even if they don't have a specific row in `project_members`.

## Verification

### Automated Verification

1. **Schema**: Run `docs/db/verify_fixes.sql` in Supabase SQL Editor.
   - Verifies template visibility.
   - Verifies recursion checks (deep inserts).
   - Verifies RLS blocks (unauthorized inserts).

### Manual Verification

1. **Invites**:
   - Invite a user -> Success message shows -> Modal closes after delay.
   - Re-invite same user -> No error (Upsert works).
2. **Dashboard**:
   - Create new project -> Immediately visible.
   - Admin user -> Can access templates.
