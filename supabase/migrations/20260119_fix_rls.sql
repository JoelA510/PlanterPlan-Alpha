-- Security Remediation: Fix RLS Bypass and Implement RBAC
-- Date: 2026-01-19

-- 1. Implement has_project_role (Strict member check)
-- Removes hardcoded "RETURN true"
-- Note: Keeping parameter name as 'p_task_id' to match existing DB signature and avoid DROP CASCADE issues.
CREATE OR REPLACE FUNCTION public.has_project_role(p_task_id uuid, p_user_id uuid, p_allowed_roles text[])
RETURNS boolean AS $$
DECLARE
    v_role text;
BEGIN
    -- Check Project Members table directly
    -- We treat p_task_id as the project_id (root_task) for this lookup
    SELECT role INTO v_role 
    FROM public.project_members 
    WHERE project_id = p_task_id 
    AND user_id = p_user_id;

    -- If role exists and is in allowed list, return true
    IF v_role IS NOT NULL AND v_role = ANY(p_allowed_roles) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update tasks Policy to use Creator check OR Member check
-- Prevents public read access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tasks;

CREATE POLICY "Enable read access for all users" ON public.tasks 
FOR SELECT USING (
    -- 1. Direct Ownership (Creator) - Fast verification
    creator = auth.uid()
    OR 
    -- 2. Project Membership (via Root ID or Self ID) - Role verification
    -- We check COALESCE(root_id, id) to handle both Root Projects and Child Tasks
    public.has_project_role(COALESCE(root_id, id), auth.uid(), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited'])
);
