-- 1. Grant Permissions (Fixes "Tasks not showing up")
GRANT EXECUTE ON FUNCTION public.has_project_role(uuid, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_task_root_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid, uuid) TO service_role;

-- 2. Create a Trusted Function to break Project Members recursion
-- This function checks if a user owns a project WITHOUT triggering the tasks table RLS.
CREATE OR REPLACE FUNCTION public.check_project_ownership(p_id UUID, u_id UUID) 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER -- Runs as owner (postgres) to bypass RLS
SET search_path = public -- Secure search path
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE id = p_id AND creator = u_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_project_ownership(uuid, uuid) TO authenticated;

-- 3. Update project_members Policy to use the Trusted Function
DROP POLICY IF EXISTS members_select_policy ON public.project_members;
CREATE POLICY members_select_policy ON public.project_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR
  public.is_active_member(project_id, auth.uid())
  OR
  -- FIX: Use function instead of direct SELECT to avoid recursion loop with tasks RLS
  public.check_project_ownership(project_id, auth.uid())
);

DROP POLICY IF EXISTS members_insert_policy ON public.project_members;
CREATE POLICY members_insert_policy ON public.project_members
FOR INSERT
WITH CHECK (
  -- FIX: Use function here too
  public.check_project_ownership(project_id, auth.uid())
  OR
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'owner'
  )
);

DROP POLICY IF EXISTS members_update_policy ON public.project_members;
CREATE POLICY members_update_policy ON public.project_members
FOR UPDATE
USING (
  public.check_project_ownership(project_id, auth.uid())
  OR
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'owner'
  )
);

DROP POLICY IF EXISTS members_delete_policy ON public.project_members;
CREATE POLICY members_delete_policy ON public.project_members
FOR DELETE
USING (
  user_id = auth.uid() 
  OR
  public.check_project_ownership(project_id, auth.uid())
  OR
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'owner'
  )
);
