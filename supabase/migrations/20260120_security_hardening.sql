-- Consolidated Security Hardening Migration
-- Date: 2026-01-20
-- Merges: 20260119_fix_rls.sql, 20260120_cleanup_policies.sql, 20260120_final_fix.sql
-- Fixes: Parameter name conflict & Dependency Chain failure

-- 1. Reload PostgREST Schema Cache (Fixes RPC "function not found")
NOTIFY pgrst, 'reload';

-- ============================================================================
-- 2. FUNCTIONS (RPC) - CLEANUP
-- ============================================================================

-- RLS Helper: has_project_role
-- Note: Renamed p_task_id to p_project_id for semantic clarity as requested in PR 34
-- CRITICAL STEP: Use CASCADE to drop policies depending on old signature/OID
DROP FUNCTION IF EXISTS public.has_project_role(uuid, uuid, text[]) CASCADE;

CREATE OR REPLACE FUNCTION public.has_project_role(p_project_id uuid, p_user_id uuid, p_allowed_roles text[])
RETURNS boolean AS $$
DECLARE
    v_role text;
BEGIN
    -- Check Project Members table directly
    SELECT role INTO v_role 
    FROM public.project_members 
    WHERE project_id = p_project_id 
    AND user_id = p_user_id;

    -- If role exists and is in allowed list, return true
    IF v_role IS NOT NULL AND v_role = ANY(p_allowed_roles) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant Permissions (Ensure function is callable)
GRANT EXECUTE ON FUNCTION public.has_project_role(uuid, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_project_role(uuid, uuid, text[]) TO service_role;

-- ============================================================================
-- 3. RLS POLICY RESTORATION (ALL TABLES)
-- ============================================================================
-- Since CASCADE dropped policies, we must re-create ALL of them.

-- A. TASKS TABLE
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop (idempotent safety)
DROP POLICY IF EXISTS "Enable insert for authenticated users within project" ON public.tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable insert for users" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated can insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
DROP POLICY IF EXISTS "Enable update for users" ON public.tasks;
DROP POLICY IF EXISTS "Enable delete for users" ON public.tasks;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tasks;

-- Re-Apply Secure Policies (Source: schema.sql)

-- SELECT
CREATE POLICY "Enable read access for all users" ON public.tasks 
FOR SELECT USING (
    creator = auth.uid()
    OR 
    public.has_project_role(COALESCE(root_id, id), auth.uid(), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited'])
);

-- INSERT: Must have write access to the project (Root ID)
CREATE POLICY "Enable insert for authenticated users within project" ON public.tasks 
FOR INSERT WITH CHECK (
    public.has_project_role(root_id, auth.uid(), ARRAY['owner', 'editor'])
);

-- UPDATE: Must be Creator OR have Write Access (Owner/Editor)
CREATE POLICY "Enable update for users" ON public.tasks 
FOR UPDATE USING (
    creator = auth.uid()
    OR 
    public.has_project_role(COALESCE(root_id, id), auth.uid(), ARRAY['owner', 'editor'])
);

-- DELETE: Must be Creator OR have Write Access (Owner/Editor)
CREATE POLICY "Enable delete for users" ON public.tasks 
FOR DELETE USING (
    creator = auth.uid()
    OR 
    public.has_project_role(COALESCE(root_id, id), auth.uid(), ARRAY['owner', 'editor'])
);

-- B. TASK RESOURCES TABLE (Cleanup legacy)
DROP POLICY IF EXISTS "task_resources_select_policy" ON public.task_resources;
DROP POLICY IF EXISTS "task_resources_modify_policy" ON public.task_resources;

-- C. PROJECT MEMBERS TABLE
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Drop generic policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.project_members;
DROP POLICY IF EXISTS "View project members" ON public.project_members;

-- Secure Policies
CREATE POLICY "View project members" ON public.project_members
FOR SELECT USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited']) OR
    public.is_admin(auth.uid())
);

CREATE POLICY "Enable all for authenticated users" ON public.project_members 
FOR ALL USING (
    -- Only Owners can manage members
    public.has_project_role(project_id, auth.uid(), ARRAY['owner'])
    OR
    public.is_admin(auth.uid())
);

-- D. PROJECT INVITES TABLE
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View invites for project members" ON public.project_invites;
CREATE POLICY "View invites for project members" ON public.project_invites
  FOR SELECT USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor']) OR
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Create invites for project members" ON public.project_invites;
CREATE POLICY "Create invites for project members" ON public.project_invites
  FOR INSERT WITH CHECK (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor']) OR
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Delete invites for project members" ON public.project_invites;
CREATE POLICY "Delete invites for project members" ON public.project_invites
  FOR DELETE USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor']) OR
    public.is_admin(auth.uid())
  );

-- E. PEOPLE TABLE
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View people for project members" ON public.people;
CREATE POLICY "View people for project members" ON public.people
  FOR SELECT USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited']) OR
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Manage people for owners and editors" ON public.people;
CREATE POLICY "Manage people for owners and editors" ON public.people
  FOR ALL USING (
    public.has_project_role(project_id, auth.uid(), ARRAY['owner', 'editor']) OR
    public.is_admin(auth.uid())
  );

