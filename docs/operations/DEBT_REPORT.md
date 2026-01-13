# Technical Debt Report

**Date**: 2026-01-12
**Status**: In Progress

## Remediated Items (History)
- [x] **Design System Violation (`colors.js`)**: Hardcoded hex values replaced. (2026-01-12)
- [x] **Ambiguous Navigation**: Consolidated Sidebar/SideNav. (2026-01-12)
- [x] **Lint Warnings**: Reduced 54 -> 14. (2026-01-12)

## 4. Pending Debt (New Audit 2026-01-12)
### Rule 30 Violations (CSS & Charts)
- **Location**: Global CSS & `Reports.jsx`
- **Status**: [x] Completed (2026-01-12)
- **Fix**: Replaced all hardcoded hex with `var(--color-*)` mapped to Tailwind.

### Test Hygiene
- **Location**: `src/tests/integration/debug_query.test.jsx`
- **Issue**: Leftover `console.log` statements.
- **Status**: [x] Completed (2026-01-12)
- **Fix**: Removed.
