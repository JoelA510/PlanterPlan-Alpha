# Current Task & Execution Plan: Gold Master Polish

## 📍 Current Objective
> **Summary:** Finalize the gold-master integration by resolving E2E flakiness, removing unused dependencies, and syncing documentation.
> **Status:** `READY`

---

## 🧪 Phase 1: E2E Logout Flakiness
*Context: `e2e/auth.spec.ts` occasionally fails on the logout step because the headless browser navigates before the Supabase session is fully cleared.*
- **Fix:** Open `e2e/auth.spec.ts`. Refactor the "Sign Out" step to explicitly wait for the network request to `/auth/v1/logout` to complete before asserting the redirect to the login page.

## 🧹 Phase 2: Dependency Audit
*Context: The refactor introduced several Radix UI packages that are not currently utilized in the application.*
- **Audit:** Scan the codebase to see if the following components are actually imported anywhere outside of `src/shared/ui`: `accordion`, `collapsible`, `context-menu`, `hover-card`, `menubar`, `navigation-menu`, `scroll-area`, `slider`, `toggle-group`.
- **Cleanup:** Delete the unused `.jsx` files from `src/shared/ui/` and run `npm uninstall` for their corresponding `@radix-ui/react-*` packages to reduce bundle size and vulnerability surface area.

## 📝 Phase 3: Documentation Sync
*Context: We need to finalize the ADR for the React downgrade.*
- **Update:** Open `docs/ADR/002-downgrade-react.md`. Ensure it clearly states that React 18.3.1 is the permanent target until `dnd-kit` releases a stable React 19 compatible version.