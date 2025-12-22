-- Migration 005: Fix Table Permissions
-- Fixes 403 Forbidden errors by granting explicit table access to authenticated users.
-- RLS policies will still filter rows, but the role needs permission to access the table first.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_members TO service_role;
