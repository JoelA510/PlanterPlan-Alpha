-- P2-DB-RLS-POLICIES
-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Helper Function: Get Root ID (Optimized)
-- Relies on the denormalized `root_id` column maintained by triggers.
-- No recursion!
CREATE OR REPLACE FUNCTION public.get_task_root_id(t_id UUID) RETURNS UUID AS $$
DECLARE
  r_id UUID;
BEGIN
  SELECT root_id INTO r_id FROM public.tasks WHERE id = t_id;
  RETURN r_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Check if user is a member of a project
CREATE OR REPLACE FUNCTION public.is_active_member(p_id UUID, u_id UUID) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_id AND user_id = u_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Function: Check Member Role
CREATE OR REPLACE FUNCTION public.has_project_role(task_id UUID, user_id UUID, allowed_roles text[]) RETURNS boolean AS $$
DECLARE
  target_root_id UUID;
  user_role text;
BEGIN
  -- 1. Get root ID directly
  target_root_id := public.get_task_root_id(task_id);
  
  -- If task not found or has no root_id, deny
  IF target_root_id IS NULL THEN
    RETURN false;
  END IF;

  -- 2. Creator override: If user created the ROOT project, they have full access.
  -- (Optimization: Check the root task row)
  IF EXISTS (SELECT 1 FROM public.tasks WHERE id = target_root_id AND creator = user_id) THEN
    RETURN true;
  END IF;

  -- 3. Check membership
  SELECT pm.role INTO user_role
  FROM public.project_members pm
  WHERE pm.project_id = target_root_id AND pm.user_id = user_id
  LIMIT 1;

  IF user_role IS NOT NULL AND user_role = ANY(allowed_roles) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.has_project_role(uuid, uuid, text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_task_root_id(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_active_member(uuid, uuid) FROM PUBLIC;

-- Helper: isAdmin (Placeholder for ADM-01)
-- Replace with real admin logic (e.g. table lookup or claim)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID) RETURNS boolean AS $$
BEGIN
  -- Example: Hardcode a specific ID or check a table
  -- RETURN EXISTS (SELECT 1 FROM public.admin_users WHERE id = user_id);
  RETURN false; -- Default safe
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -------------------------------------------------------------------------
-- POLICIES: tasks
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS tasks_select_policy ON public.tasks;
CREATE POLICY tasks_select_policy ON public.tasks
FOR SELECT
USING (
  -- 1. Creator Access
  creator = auth.uid()
  OR 
  -- 2. Project Member Access (Recursive permission via root)
  public.has_project_role(id, auth.uid(), ARRAY['owner', 'editor', 'viewer'])
  OR
  -- 3. Template Access (SEC-01) - Public read for templates
  origin = 'template'
  OR 
  -- 4. Admin Access (ADM-01)
  public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS tasks_insert_policy ON public.tasks;
CREATE POLICY tasks_insert_policy ON public.tasks
FOR INSERT
WITH CHECK (
  -- CASE A: Creating a new Root Project
  (
    parent_task_id IS NULL 
    AND 
    creator = auth.uid()
  )
  OR
  -- CASE B: Creating a Child Task (SEC-02 Fix)
  (
    parent_task_id IS NOT NULL 
    AND 
    public.has_project_role(parent_task_id, auth.uid(), ARRAY['owner', 'editor'])
  )
  OR
  -- CASE C: Admin Override
  public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS tasks_update_policy ON public.tasks;
CREATE POLICY tasks_update_policy ON public.tasks
FOR UPDATE
USING (
  creator = auth.uid()
  OR
  public.has_project_role(id, auth.uid(), ARRAY['owner', 'editor'])
  OR
  public.is_admin(auth.uid())
)
WITH CHECK (
  creator = auth.uid()
  OR
  public.has_project_role(id, auth.uid(), ARRAY['owner', 'editor'])
  OR
  public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS tasks_delete_policy ON public.tasks;
CREATE POLICY tasks_delete_policy ON public.tasks
FOR DELETE
USING (
  creator = auth.uid()
  OR
  public.has_project_role(id, auth.uid(), ARRAY['owner'])
  OR
  public.is_admin(auth.uid())
);


-- -------------------------------------------------------------------------
-- POLICIES: project_members
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS members_select_policy ON public.project_members;
CREATE POLICY members_select_policy ON public.project_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR
  public.is_active_member(project_id, auth.uid())
  OR
  -- View members if you own the project (even if not in members table)
  EXISTS(SELECT 1 FROM public.tasks WHERE id = project_id AND creator = auth.uid())
);

DROP POLICY IF EXISTS members_insert_policy ON public.project_members;
CREATE POLICY members_insert_policy ON public.project_members
FOR INSERT
WITH CHECK (
  -- Only Owners (Creator or Member-Owner) can invite
  project_id IN (
    SELECT id FROM public.tasks WHERE creator = auth.uid()
  )
  OR
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'owner'
  )
);

DROP POLICY IF EXISTS members_update_policy ON public.project_members;
CREATE POLICY members_update_policy ON public.project_members
FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM public.tasks WHERE creator = auth.uid()
  )
  OR
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'owner'
  )
);

DROP POLICY IF EXISTS members_delete_policy ON public.project_members;
CREATE POLICY members_delete_policy ON public.project_members
FOR DELETE
USING (
  -- Owner can delete members; Member can remove self? (Maybe)
  user_id = auth.uid() 
  OR
  project_id IN (
    SELECT id FROM public.tasks WHERE creator = auth.uid()
  )
  OR
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'owner'
  )
);