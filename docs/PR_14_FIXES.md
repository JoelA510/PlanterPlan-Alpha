# PR #14 Fixes Summary

This document outlines the technical changes implemented to bring the `refactor` branch up to the requirements of PR #14, satisfying all reviewer feedback.

## 1. Local Development Unblocked

**Goal**: Ensure a reproducible local setup passing all checks.

- **Linting**: Resolved `eslint-plugin-prettier` configuration conflicts. Codebase is now fully Prettier-compliant.
- **Commands**:
  - `npm run lint`: Fully passing.
  - `npm run format`: Formats all files.

## 2. Membership & Joined Projects (P2)

**Goal**: Allow users to see and access projects they have been invited to, and invite others.

- **Service Layer (`src/services/projectService.js`)**:
  - Updated `getJoinedProjects` to robustly handle errors and return `{ data, error }`.
  - Added `inviteMember(projectId, userId, role)` to handle invitations.
- **UI (`TaskList.jsx`, `InviteMemberModal.jsx`)**:
  - Added "Joined Projects" section with specific error/empty states.
  - Added "Invite Member" button to project cards (Owner only).
  - Implemented `InviteMemberModal` for adding members by User ID.
- **Role Indicator**: Added UI badge for Owner/Editor/Viewer roles.

## 3. Master Library Search Fixes

**Goal**: Ensure search is reliable, safe, and handles errors gracefully.

- **Sanitization**: Added input length limits and type safety to `taskService.js`.
- **Defensive Rendering**: Updated `MasterLibrarySearch.jsx` to safely handle `undefined` results and prevent crashes.
- **Regex Safety**: Validated `highlightMatches` utility against regex injection.
- **Testing**: Added unit tests in `taskService.test.js` covering edge cases.

## 4. RLS Security Gaps (Database)

**Goal**: Enforce strict role-based access control at the database level.

- **Policies (`docs/db/policies.sql`)**:
  - Implemented `get_task_root_id` and `has_project_role` helper functions to handle hierarchical security without schema changes.
  - **SELECT**: Restricted to Creator OR Project Members (Viewer+).
  - **INSERT**: Restricted to Creator OR Project Members (Editor+).
  - **UPDATE**: Restricted to Creator OR Project Members (Editor+).
  - **DELETE**: Restricted to Creator OR Project Owners.
  - **Project Members**: Strict policies for viewing and managing members.

## Verification Steps

### Automated Verification

1. **Linting**: Run `npm run lint`. Success = No errors.
2. **Unit Tests**: Run `npm test`. Success = All tests pass (Service logic, Regex safety).

### Manual Verification

1. **Joined Projects**:
   - Login as User A. Create "Project A".
   - Click "Invite" on Project A card. Enter User B's UUID (from Supabase Auth).
   - Login as User B. "Project A" should appear in "Joined Projects".
2. **Master Library**:
   - Open "New Project" form.
   - Type in Master Library search.
   - Verify results render correctly. Enter invalid regex characters (`(`, `*`) to verify no crash.
3. **RLS Policy Check**:
   - Execute `docs/db/policies.sql` in Supabase SQL Editor.
   - Verify that a "Viewer" cannot update tasks via SQL/API console.

## Deployment Note (Vercel)

> [!NOTE]
> **Authorization**: Ensure your Vercel project is correctly authorized to access your Supabase instance.
>
> - Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables in Vercel.
> - If using Vercel Integrations, ensure the token has not expired.
