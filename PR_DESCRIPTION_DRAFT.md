# Stabilize/v1.0 Impl: Regression Fixes & Security Hardening

## 🚀 Summary
This PR addresses critical frontend regressions and security vulnerabilities identified during the `v1.0` stabilization audit. It restores lost functionality (DnD, RBAC permissions) and hardens RPC endpoints against unauthorized access.

## 🛠️ Key Changes

### 🔒 Security Hardening
- **SQL Migration Fix**: Corrected invalid syntax in `2026_02_17_stabilization_v1.sql` (`WHERE v IS NOT NULL` -> `WHERE parent_task_id IS NOT NULL`).
- **Authorization Fix**: Updated `invite_user_to_project` to explicitly reject `NULL` roles, preventing anonymous/unauthorized users from bypassing the inviter check.
- **Access Control**: Added a strict ownership/membership check to `clone_project_template` (SECURITY DEFINER) to prevent unauthorized data cloning.

### 🐛 Regression Fixes
- **RBAC Fallback**: `Project.jsx` now correctly grants Owner privileges (edit/invite) even if the owner's profile is missing from the `project_members` list (sync delay handling).
- **Drag-and-Drop Stability**: 
  - Fixed `calculateDropTarget` in `dragDropUtils.js` to prevent subtasks from "disappearing" by removing an incorrect fallback to `overId`.
  - Implemented `useDroppable` in `MilestoneSection.jsx` to allow dragging tasks into empty milestones.
- **RLS Compatibility**: Refactored `positionService.js` to use concurrent `update` calls instead of `upsert`, ensuring compatibility with RLS policies that block `INSERT` on existing rows.

### 🧪 Tests
- **New Unit Test**: `src/tests/unit/RPCHardening.test.js` verifies the security fixes for `invite_user_to_project` and `clone_project_template`.
- **Fixed Unit Test**: Updated mocks in `useTaskOperations.test.jsx` to support the `supabase.from().select()` chain.
- **Full Suite Verification**: 
  - ✅ **Unit Tests**: 140 Passing
  - ✅ **E2E Tests**: 24 Scenarios Passing

## 📋 Checklist
- [x] Migrations fixed and verified.
- [x] Security holes plugged (Auth Bypass, improper Security Definer usage).
- [x] Frontend DnD and Permissions restored.
- [x] All tests passing.

---
**Reviewer Note**: This PR consolidates the final stability work for the v1.0 release candidate.