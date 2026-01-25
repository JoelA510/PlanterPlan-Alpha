# Engineering Knowledge Base

## [CONTEXT-001] Context Size Management
**Tags:** #context #ai #refactor
**Date:** 2026-01-25
**Context & Problem**: Project context size exceeded window limits due to large backup files (`seed_recovery.sql`: 188KB) and unoptimized builds.
**Solution & Pattern**:
1.  **Archive**: Move non-essential files to `archive/` and `.gitignore` them.
2.  **Tree-shaking**: Use named imports for heavy libraries like `recharts`.
3.  **UI Unification**: Consolidate patterns into generic components (`StatusCard`).
**Critical Rule**: Always check `git ls-files | xargs wc -l` and bundle size before adding assets.

## [SECURITY-002] RLS Function Security
**Tags:** #rls #supabase #security
**Date:** 2026-01-25
**Context & Problem**: RLS policies using `auth.uid()` directly in complex queries can be bypassed.
**Solution & Pattern**: Use strict `SECURITY DEFINER` functions with fixed `search_path` (e.g., `has_project_role`).
**Critical Rule**: Never trust `public` functions in RLS policies.
