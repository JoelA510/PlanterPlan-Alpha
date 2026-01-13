-- Migration: Advanced RBAC (Add 'coach' and 'limited' roles)
-- Date: 2026-01-13

BEGIN;

-- 1. Drop existing check constraint
ALTER TABLE public.project_members
DROP CONSTRAINT IF EXISTS project_members_role_check;

-- 2. Add new check constraint with expanded roles
ALTER TABLE public.project_members
ADD CONSTRAINT project_members_role_check
CHECK (role IN ('owner', 'editor', 'coach', 'viewer', 'limited'));

COMMIT;
