# Technical Debt Report

**Date**: 2026-01-12
**Status**: In Progress

## 1. Critical Debt (Rule Violations)
### Design System Violation (`colors.js`)
- **Location**: `src/app/constants/colors.js`
- **Violation**: Hardcoded hex values (`#94a3b8`, etc.) violate [Rule 30] ("Do not hardcode hex values").
- **Status**: [x] Completed (2026-01-12)
- **Fix**: Refactor to use CSS variable references (e.g., `hsl(var(--muted-foreground))`) or Tailwind utility resolution.

## 2. Maintainability & Structural Debt
### Ambiguous Navigation Components
- **Location**: `src/features/navigation/components/`
- **Issue**: Coexistence of `Sidebar.jsx` and `SideNav.jsx`.
    - `Sidebar.jsx` contains layout logic + "Current Project" rendering.
    - `SideNav.jsx` (used in Settings) appears to be a "smart" list.
- **Status**: [x] Completed (2026-01-12)
- **Fix**: Merged into `AppSidebar` (Static) and `ProjectSidebar` (Dynamic).

### Lint Warnings (54)
- **Location**: Global
- **Issue**: `no-unused-vars`, `react-refresh/only-export-components`.
- **Impact**: Noise in build logs; potential bug hiding.
- **Fix**: Surgical refactor to remove unused vars.

## 3. Documentation Debt
### Stale Artifacts
- **Files**:
    - `code_review_draft.md` (Root)
    - `docs/git_documentation/review_report.md`
- **Issue**: Temporary files left over from previous workflows.
- **Status**: [x] Completed (2026-01-12)
- **Fix**: Delete or archive.

## Remediation Plan
1. **[Core]** Fix `colors.js` to use Semantic Tokens.
2. **[Docs]** Delete stale markdown files.
3. **[Structure]** Investigate and unify Sidebar logic.
4. **[Hygiene]** Burn down lint warnings.
