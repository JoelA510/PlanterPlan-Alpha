# PR Description: Exhaustive Audit & Security Hardening

## Summary
This PR represents the culmination of a deep-scan audit focusing on Security, Correctness, and Hygiene.
Key highlights:
- **Critical Security Fix**: Locked down `tasks` table RLS (was Public Read). Now strictly enforces Creator or Project Member access.
- **Architecture**: Extracted `StatusPieChart` and implemented Semantic Navigation (Links) in Sidebar.
- **Hygiene**: Removed ~900 lines of dead CSS and resolved all lint warnings.
- **Correctness**: Fixed Premium License gating logic.

##  Roadmap Progress

| Feature | Status | Note |
| :--- | :--- | :--- |
| **RLS Security** | ✅ Done | Locked down `tasks` table. |
| **License Gating** | ✅ Done | Fixed logic in `TaskDetailsView`. |
| **Visual Hygiene** | ✅ Done | Removed legacy CSS files. |
| **Chart Components** | ✅ Done | Extracted `StatusPieChart`. |

## Key Changes

### 🛡️ Security
- **`supabase/migrations/20260119_fix_rls.sql`**: New migration replacing the insecure "Public Read" policy with a strict Creator/Member check.
- **`docs/db/schema.sql`**: Updated Single Source of Truth for schema.

### 🧹 Refactoring & Hygiene
- **`src/styles/components/*.css`**: DELETED. Consolidated into Tailwind utility classes.
- **`src/features/reports/components/StatusPieChart.jsx`**: Extracted from `ProjectReport.jsx` for reusability.
- **`SidebarNavItem.jsx`**: Now uses `Link` for proper client-side routing.

### 🐛 Bug Fixes
- **`TaskDetailsView.jsx`**: Removed hardcoded `hasLicense = false`.
- **`useTaskSubscription.js`**: Cleaned up debug logging.

## Verification Plan

### Automated Tests
Ran full test suite (23 suites).
```bash
npm test
```
All tests passed, including regression tests for Navigation and Unit tests for the new Chart component.

### Manual Verification
1. **Security**: Verified RLS policy logic via unit test mocks (DB layer requires actual migration apply).
2. **Navigation**: Clicked Sidebar links -> verified URL update without full reload.
3. **Charts**: Verified Project Report renders Pie Chart correctly.
