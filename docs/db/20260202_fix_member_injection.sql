-- Security Patch: Fix RLS Member Injection Vulnerability
-- Date: 2026-02-04
-- ID: 20260202_fix_member_injection
-- Description: Enforce strict RLS policies on project_members to prevent unauthorized user addition.

BEGIN;

-- 1. Ensure RLS is enabled
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (including potentially loose ones)
-- We drop by name if they match known patterns from previous schemas
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.project_members;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.project_members; 
DROP POLICY IF EXISTS "Users can add themselves" ON public.project_members;
DROP POLICY IF EXISTS "View project members" ON public.project_members;
DROP POLICY IF EXISTS "Manage members" ON public.project_members;

-- 3. Re-Create "View project members"
-- Allow any member to see who else is on the team
CREATE POLICY "View project members" ON public.project_members
  FOR SELECT USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited']) OR
    public.is_admin(auth.uid())
  );

-- 4. Re-Create "Manage members" (Strict)
-- Only 'owner' or 'admin' can Insert, Update, or Delete members.
-- This prevents 'editor' or random users from injecting members.
CREATE POLICY "Manage members" ON public.project_members 
FOR ALL USING (
    -- Check if the ACTOR is an OWNER of the target project
    public.has_project_role(project_id, auth.uid(), ARRAY['owner'])
    OR
    public.is_admin(auth.uid())
);

COMMIT;
