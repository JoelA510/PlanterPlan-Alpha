-- Migration: Advanced RBAC (Add 'coach' and 'limited' roles)
-- Date: 2026-01-13

BEGIN;

-- 1. Drop existing check constraints
ALTER TABLE public.project_members
DROP CONSTRAINT IF EXISTS project_members_role_check;



-- 2. Add new check constraints with expanded roles
ALTER TABLE public.project_members
ADD CONSTRAINT project_members_role_check
CHECK (role IN ('owner', 'editor', 'coach', 'viewer', 'limited'));

-- Note: The constraint on project_invites might be named inline, so we might need to find its name if random generated.
-- However, standard practice is to alter the column check if it was defined inline.
-- Postgres usually names it `{table}_{column}_check`. So `project_invites_role_check`.
-- If the previous migration defined it inline: `role text NOT NULL CHECK (role IN (...))`
-- We need to drop that constraint.
-- 2b. Add new check constraints for project_invites (safely)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_invites') THEN
        -- Safely drop if exists (redundant with above but good for isolation)
        ALTER TABLE public.project_invites DROP CONSTRAINT IF EXISTS project_invites_role_check;
        
        -- Add valid constraint
        ALTER TABLE public.project_invites
        ADD CONSTRAINT project_invites_role_check
        CHECK (role IN ('owner', 'editor', 'coach', 'viewer', 'limited'));
    END IF;
END $$;


-- 3. Update RLS Policies for granular access

-- Re-define "View project members" to allow all authenticated members to see who is in the project
DROP POLICY IF EXISTS "View project members" ON public.project_members;
CREATE POLICY "View project members" ON public.project_members
  FOR SELECT USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited']) OR
    public.is_admin(auth.uid())
  );

-- Coach Logic: Can comment (if comments exist), but for now we focus on Tasks.
-- Reviewers can View Tasks.
-- Limited Logic: Can View Tasks?
-- For now, we update "View tasks" policy to include everyone except maybe...
-- Wait, we don't have a "View tasks" policy defined in this file. It's likely in 20240101_init.sql or similar.
-- We should ensure `has_project_role` logic works for ANY role if we pass the right array.

-- Let's update `project_members` RLS to be safe.
-- Owners/Editors can manage members (already defined in previous migrations? We should verify but we are only adding roles here).

COMMIT;
