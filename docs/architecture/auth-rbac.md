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

> **Footnote (Wave 29):** Viewer/Limited users may also edit tasks **under** any phase or milestone they are designated as Phase Lead for (not the phase/milestone row itself — assignment stays owner-only). See "Phase Lead" section below.

### Creatorship vs. Ownership (resolved Wave 24)

Historically `public.check_project_ownership(pid, uid)` was used as the
"is this user allowed to act on a project"-gate in RLS policies on
`public.project_members`. The function actually checked `tasks.creator =
uid` — whether the user was the original *creator* — **not** whether
they currently held the `owner` role. A creator who was later removed
from `project_members` still passed the check, which was the latent auth
bug called out in `docs/dev-notes.md`.

**Wave 23 (audit only):** split the concepts at the name level. Added
`public.check_project_creatorship(pid, uid)` carrying the original body;
rewrote `check_project_ownership` to a SQL shim delegating to it so the
four policies on `project_members` kept evaluating byte-for-byte
identically. Per-policy intent captured as inline comments.

**Wave 24 (behavior change — closes the leak):** rewrote each policy per
the audited intent, introduced `public.check_project_ownership_by_role(pid,
uid)` (STABLE, SECURITY DEFINER) for genuine ownership checks against
`project_members.role = 'owner'`, and **dropped the
`check_project_ownership` shim**. A former creator who is no longer in
`project_members` no longer passes the DELETE / UPDATE gates.

| Policy | Op | Final state (Wave 24) |
| --- | --- | --- |
| `members_delete_policy` | DELETE | `user_id = auth.uid()` OR `check_project_ownership_by_role(project_id, auth.uid())`. |
| `members_insert_policy` | INSERT | `check_project_creatorship(project_id, auth.uid())` (bootstrap) OR `project_id ∈ (SELECT … WHERE user_id = auth.uid() AND role = 'owner')` (already an owner). |
| `members_select_policy` | SELECT | `user_id = auth.uid()` OR `is_active_member(project_id, auth.uid())`. Creatorship branch removed. |
| `members_update_policy` | UPDATE | `check_project_ownership_by_role(project_id, auth.uid())`; `WITH CHECK` still blocks self-demotion to `viewer`. |

Migration: `docs/db/migrations/2026_04_18_rewrite_project_members_policies.sql`.

## Integration Points
* **Supabase Client:** Handles session persistence and edge-function authentication tokens.
* **Team Management:** Feeds contextual role data into the UI (e.g., `RoleIndicator.tsx`) to conditionally render administrative components.

## Known Gaps / Technical Debt
* **Licensing Enforcement:** Logic mapping Stripe subscription states to project creation limits requires further hardening.

## Resolved

* **Coach Role Tagging (Wave 22, 2026-04-17):** Resolved. Tasks intended for coach editing are now flagged via `settings -> 'is_coaching_task' = true`. A project owner or editor tags the task through the "Coaching task" checkbox in TaskForm; TaskDetailsView surfaces a "Coaching" badge. An additive RLS UPDATE policy — `"Enable update for coaches on coaching tasks"` (see `docs/db/migrations/2026_04_17_coaching_task_rls.sql`) — allows any user with the project `coach` role to update rows where the flag is true, scoped to non-template origins. The pre-existing owner/editor/admin UPDATE policy is unchanged, so coaches retain zero access to non-coaching rows.

* **Comments (Wave 26):** SELECT inherits project membership; INSERT requires `author_id = auth.uid()`; UPDATE restricted to authors on undeleted rows; DELETE allowed for authors, project owners (`check_project_ownership_by_role`), or admins. Full policy text in `docs/architecture/tasks-subtasks.md`.

* **Activity Log (Wave 27):** SELECT inherits project membership; INSERT/UPDATE/DELETE denied at policy level — only SECURITY DEFINER trigger functions write rows.

### Phase Lead (Wave 29)

A project Owner may designate any `viewer` or `limited`-role member as the **Lead** of a specific phase or milestone via `settings.phase_lead_user_ids` (a JSONB array on the phase/milestone row). The list allows multiple leads per phase; a single user can lead multiple phases.

**RLS** (migration `docs/db/migrations/2026_04_18_phase_lead_rls.sql`):
* Helper: `user_is_phase_lead(target_task_id uuid, uid uuid)` walks up the `parent_task_id` chain **starting at the parent** (the row itself is never matched) and returns true if any ancestor's `settings.phase_lead_user_ids` contains `uid`. Self-exclusion is load-bearing: a Phase Lead can edit tasks UNDER a phase but cannot edit the phase row itself.
* Policy: `"Enable update for phase leads"` on `public.tasks` — `USING (origin = 'instance' AND user_is_phase_lead(id, auth.uid()))` with a matching `WITH CHECK`.
* **Additive only** — owner/editor/coach UPDATE policies are unchanged. SELECT for viewers is unchanged (already project-wide).

**UI** (`src/features/tasks/components/TaskFormFields.tsx`): the `<PhaseLeadPicker>` sub-component (multi-select popover) renders only for `membershipRole === 'owner'` on phase/milestone rows. Options come from `useTeam(projectId).teamMembers.filter(m => m.role === 'viewer' || m.role === 'limited')` — owners/editors/coaches/admins are NOT in the picker because they already have UPDATE via existing policies. Badge in `TaskDetailsView.tsx` lists current leads.

**Permission matrix update**: limited viewers may now edit tasks under any phase/milestone they are designated as Phase Lead for. See the matrix footnote above.