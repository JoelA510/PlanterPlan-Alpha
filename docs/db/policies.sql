-- P2-DB-RLS-POLICIES
-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Helper Function: Get Root ID of a task (Recursive)
CREATE OR REPLACE FUNCTION public.get_task_root_id(t_id UUID) RETURNS UUID AS $$
DECLARE
  parent UUID;
  found_root UUID;
BEGIN
  SELECT parent_task_id INTO parent FROM public.tasks WHERE id = t_id;
  IF parent IS NULL THEN
    RETURN t_id;
  END IF;

  WITH RECURSIVE task_tree AS (
    SELECT id, parent_task_id
    FROM public.tasks
    WHERE id = t_id
    UNION ALL
    SELECT t.id, t.parent_task_id
    FROM public.tasks t
    INNER JOIN task_tree tt ON t.id = tt.parent_task_id
  )
  SELECT id INTO found_root
  FROM task_tree
  WHERE parent_task_id IS NULL
  LIMIT 1;

  RETURN found_root;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: restrict execute to non-public (users access via policies)
REVOKE EXECUTE ON FUNCTION public.get_task_root_id(uuid) FROM PUBLIC;

-- Helper: Check if user is a member of a project
CREATE OR REPLACE FUNCTION public.is_active_member(p_id UUID, u_id UUID) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_id AND user_id = u_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.is_active_member(uuid, uuid) FROM PUBLIC;

-- Helper Function: Check Member Role
CREATE OR REPLACE FUNCTION public.has_project_role(task_id UUID, user_id UUID, allowed_roles text[]) RETURNS boolean AS $$
DECLARE
  root_id UUID;
  user_role text;
BEGIN
  root_id := public.get_task_root_id(task_id);

  -- Creator override
  IF EXISTS (SELECT 1 FROM public.tasks WHERE id = root_id AND creator = user_id) THEN
    RETURN true;
  END IF;

  SELECT pm.role INTO user_role
  FROM public.project_members pm
  WHERE pm.project_id = root_id AND pm.user_id = user_id
  LIMIT 1;

  IF user_role IS NOT NULL AND user_role = ANY(allowed_roles) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.has_project_role(uuid, uuid, text[]) FROM PUBLIC;


-- POLICIES: tasks

DROP POLICY IF EXISTS tasks_select_policy ON public.tasks;
CREATE POLICY tasks_select_policy ON public.tasks
FOR SELECT
USING (
  creator = auth.uid()
  OR 
  public.has_project_role(id, auth.uid(), ARRAY['owner', 'editor', 'viewer'])
);

DROP POLICY IF EXISTS tasks_insert_policy ON public.tasks;
CREATE POLICY tasks_insert_policy ON public.tasks
FOR INSERT
WITH CHECK (
  creator = auth.uid()
  OR
  (
    parent_task_id IS NOT NULL 
    AND 
    public.has_project_role(parent_task_id, auth.uid(), ARRAY['owner', 'editor'])
  )
);

DROP POLICY IF EXISTS tasks_update_policy ON public.tasks;
CREATE POLICY tasks_update_policy ON public.tasks
FOR UPDATE
USING (
  creator = auth.uid()
  OR
  public.has_project_role(id, auth.uid(), ARRAY['owner', 'editor'])
);

DROP POLICY IF EXISTS tasks_delete_policy ON public.tasks;
CREATE POLICY tasks_delete_policy ON public.tasks
FOR DELETE
USING (
  creator = auth.uid()
  OR
  public.has_project_role(id, auth.uid(), ARRAY['owner'])
);


-- POLICIES: project_members

DROP POLICY IF EXISTS members_select_policy ON public.project_members;
CREATE POLICY members_select_policy ON public.project_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR
  public.is_active_member(project_id, auth.uid())
  OR
  project_id IN (
    SELECT id FROM public.tasks WHERE creator = auth.uid()
  )
);

DROP POLICY IF EXISTS members_insert_policy ON public.project_members;
CREATE POLICY members_insert_policy ON public.project_members
FOR INSERT
WITH CHECK (
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