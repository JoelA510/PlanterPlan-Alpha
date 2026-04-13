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

## Integration Points
* **Supabase Client:** Handles session persistence and edge-function authentication tokens.
* **Team Management:** Feeds contextual role data into the UI (e.g., `RoleIndicator.tsx`) to conditionally render administrative components.

## Known Gaps / Technical Debt
* **Coach Role Tagging:** "Coaching tasks" must be explicitly tagged in the database schema to grant edit access to Coach users.
* **Licensing Enforcement:** Logic mapping Stripe subscription states to project creation limits requires further hardening.