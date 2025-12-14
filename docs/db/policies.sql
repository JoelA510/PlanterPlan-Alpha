-- P2-DB-RLS-POLICIES
-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Helper Function: Get Root ID of a task (Recursive)
CREATE OR REPLACE FUNCTION get_task_root_id(t_id UUID) RETURNS UUID AS $$
DECLARE
  parent UUID;
  current_id UUID := t_id;
  found_root UUID;
BEGIN
  -- Optimization: Check if the task itself is a root (parent_task_id is NULL)
  SELECT parent_task_id INTO parent FROM tasks WHERE id = t_id;
  IF parent IS NULL THEN
    RETURN t_id;
  END IF;

  -- Recursive CTE to find root
  WITH RECURSIVE task_tree AS (
    SELECT id, parent_task_id
    FROM tasks
    WHERE id = t_id
    UNION ALL
    SELECT t.id, t.parent_task_id
    FROM tasks t
    INNER JOIN task_tree tt ON t.id = tt.parent_task_id
  )
  SELECT id INTO found_root
  FROM task_tree
  WHERE parent_task_id IS NULL;

  RETURN found_root;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Function: Check Member Role
-- Returns true if user has one of the allowed roles for the project (root of task_id)
CREATE OR REPLACE FUNCTION has_project_role(task_id UUID, user_id UUID, allowed_roles text[]) RETURNS boolean AS $$
DECLARE
  root_id UUID;
  user_role text;
BEGIN
  root_id := get_task_root_id(task_id);
  
  -- Check if user is the CREATOR of the root task (Owner override)
  -- Note: tasks table 'creator' column used as owner
  PERFORM 1 FROM tasks WHERE id = root_id AND creator = user_id;
  IF FOUND THEN
    RETURN true;
  END IF;

  -- Check project_members
  SELECT role INTO user_role FROM project_members WHERE project_id = root_id AND project_members.user_id = has_project_role.user_id;
  
  IF user_role IS NOT NULL AND user_role = ANY(allowed_roles) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- POLICIES: tasks

-- SELECT: Creator OR Member (viewer, editor, owner)
CREATE POLICY "tasks_select_policy" ON tasks
FOR SELECT
USING (
  creator = auth.uid() 
  OR 
  has_project_role(id, auth.uid(), ARRAY['owner', 'editor', 'viewer'])
);

-- INSERT: Creator OR Member (editor, owner)
-- New root tasks (projects) can be created by anyone (creator = auth.uid check handles ownership).
-- Subtasks: must be Editor/Owner of the root.
CREATE POLICY "tasks_insert_policy" ON tasks
FOR INSERT
WITH CHECK (
  creator = auth.uid()
  OR
  (
    -- For subtasks, parent_task_id is distinct. 
    -- We need to check if we have write access to the *parent's* project.
    parent_task_id IS NOT NULL 
    AND 
    has_project_role(parent_task_id, auth.uid(), ARRAY['owner', 'editor'])
  )
);

-- UPDATE: Creator OR Member (editor, owner)
CREATE POLICY "tasks_update_policy" ON tasks
FOR UPDATE
USING (
  creator = auth.uid()
  OR
  has_project_role(id, auth.uid(), ARRAY['owner', 'editor'])
);

-- DELETE: Creator OR Member (owner only)
CREATE POLICY "tasks_delete_policy" ON tasks
FOR DELETE
USING (
  creator = auth.uid()
  OR
  has_project_role(id, auth.uid(), ARRAY['owner'])
);


-- POLICIES: project_members

-- SELECT: Members can see members of the same project
CREATE POLICY "members_select_policy" ON project_members
FOR SELECT
USING (
  user_id = auth.uid() -- Can see own membership
  OR
  project_id IN ( -- Can see members of projects I am a member of
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  OR
  project_id IN ( -- Can see members of projects I own (created)
    SELECT id FROM tasks WHERE creator = auth.uid()
  )
);

-- INSERT: Owners (Creators of the project) can insert members
CREATE POLICY "members_insert_policy" ON project_members
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM tasks WHERE creator = auth.uid()
  )
  OR
  -- Also allow 'owner' role in project_members to invite others?
  project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- UPDATE: Owners can update members
CREATE POLICY "members_update_policy" ON project_members
FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM tasks WHERE creator = auth.uid()
  )
  OR
  project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- DELETE: Owners can remove members; Members can leave (delete themselves)
CREATE POLICY "members_delete_policy" ON project_members
FOR DELETE
USING (
  user_id = auth.uid() -- Leave project
  OR
  project_id IN ( -- Remove others if owner
    SELECT id FROM tasks WHERE creator = auth.uid()
  )
  OR
  project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner'
  )
);
