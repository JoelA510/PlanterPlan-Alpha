# docs/architecture/auth-rbac.md

## Domain Overview
The Auth & RBAC system manages application-level authentication, user account lifecycles, and access control. It relies on Supabase for core identity management and utilizes a multi-tiered permission model separating Global App roles from contextual Project-Level roles.

## Core Entities & Data Models
* **App User:** The foundational identity object managed via Supabase Auth.
* **Global Roles:**
  * **Admin:** System-wide administrator. Manages Templates, Master Library, Resource Library, Analytics Dashboard, User Licenses, and Discount Codes.
  * **User:** Standard application user. Can sign up, create projects (subject to licensing), and join projects.
* **Project Roles:** Contextual permissions applied per project instance (`Owner`, `Editor`, `Viewer`, `Coach`).

## State Machines / Lifecycles
### Authentication Lifecycle
1. **Unauthenticated:** User inputs credentials on signup/login.
2. **Pending Confirmation:** System sends a confirmation email. User verifies via Supabase secure link.
3. **Authenticated:** User receives session token and gains access to the application via `AuthContext`.
4. **Error Handling:** Standardized generic error messages for invalid credentials to prevent enumeration.

## Business Rules & Constraints
* **Project Role Permission Matrix:**

| Permission / Action | Owner | Editor | Viewer (Limited) | Coach |
| :--- | :--- | :--- | :--- | :--- |
| **View all tasks/hierarchy** | Yes | Yes | Yes | Yes |
| **Edit task text info/fields**| Yes | Yes | Yes (If Assigned Lead) | Yes (Coaching Tasks Only)|
| **Update task status** | Yes | Yes | Yes (If Assigned Lead) | Yes (Coaching Tasks Only)|
| **Add tasks / subtasks** | Yes | Yes | Yes (If Assigned Lead) | No |
| **Delete tasks / subtasks** | Yes | Yes | No | No |
| **Assign Lead to task** | Yes | No | No | No |
| **Drag & Drop (Mutate)** | Yes | Yes | No | No |
| **Invite / Manage Users** | Yes | No | No | No |
| **Edit project settings** | Yes | No | No | No |

### Creatorship vs. Ownership (Wave 23 audit)

Historically `public.check_project_ownership(pid, uid)` has been used as the
"is this user allowed to act on a project"-gate in RLS policies on
`public.project_members`. The function actually checks `tasks.creator =
uid` — i.e. whether the user was the original *creator* — **not** whether
they currently hold the `owner` role in `project_members`. A user who
creates a project and is later removed still passes the check.

Wave 23 splits the two concepts at the name level only (no behavior
change): a new `public.check_project_creatorship(pid, uid)` holds the
original body; the legacy `check_project_ownership` becomes a thin SQL
shim delegating to the new name so existing policies keep working
unchanged. Each of the four callsites on `public.project_members` now
carries an inline intent comment (see `docs/db/schema.sql`).

| Policy | Op | Inferred intent | Follow-up action |
| --- | --- | --- | --- |
| `members_delete_policy` | DELETE | **Ownership** — creator branch is a convenient bypass, not documented intent. | Replace `check_project_ownership` with a genuine `role = 'owner'` helper. |
| `members_insert_policy` | INSERT | **Creatorship (bootstrap)** — the project creator must self-insert as the initial `owner` row before any `owner`-role rows exist. | Migrate to `check_project_creatorship` directly. |
| `members_select_policy` | SELECT | **Redundant** — `is_active_member` OR the `user_id` self-check already covers every legitimate read. The creatorship branch only fires for removed creators — the exact leak called out in dev-notes. | Delete the creatorship clause. |
| `members_update_policy` | UPDATE | **Ownership** — same rationale as delete. | Replace with the real `role = 'owner'` helper. |

The rewrite + shim removal belong to a follow-up wave once each row's
intent is confirmed with the domain owner. The shim is scoped to one
release of runway.

## Integration Points
* **Supabase Client:** Handles session persistence and edge-function authentication tokens.
* **Team Management:** Feeds contextual role data into the UI (e.g., `RoleIndicator.tsx`) to conditionally render administrative components.

## Known Gaps / Technical Debt
* **Licensing Enforcement:** Logic mapping Stripe subscription states to project creation limits requires further hardening.

## Resolved

* **Coach Role Tagging (Wave 22, 2026-04-17):** Resolved. Tasks intended for coach editing are now flagged via `settings -> 'is_coaching_task' = true`. A project owner or editor tags the task through the "Coaching task" checkbox in TaskForm; TaskDetailsView surfaces a "Coaching" badge. An additive RLS UPDATE policy — `"Enable update for coaches on coaching tasks"` (see `docs/db/migrations/2026_04_17_coaching_task_rls.sql`) — allows any user with the project `coach` role to update rows where the flag is true, scoped to non-template origins. The pre-existing owner/editor/admin UPDATE policy is unchanged, so coaches retain zero access to non-coaching rows.