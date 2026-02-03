-- Fix RLS policy to allow creating new projects (root tasks)
-- where root_id is NULL (or not set) and parent_task_id is NULL.

DROP POLICY IF EXISTS "Enable insert for authenticated users within project" ON public.tasks;

CREATE POLICY "Enable insert for authenticated users within project" ON public.tasks 
FOR INSERT WITH CHECK (
    (
        -- Case 1: Child Task (Existing Project)
        root_id IS NOT NULL 
        AND 
        public.has_project_role(root_id, auth.uid(), ARRAY['owner', 'editor'])
    )
    OR
    (
        -- Case 2: New Project (Root Task)
        root_id IS NULL 
        AND 
        parent_task_id IS NULL
        AND
        creator = auth.uid()
    )
);

-- Ensure creators are automatically added as owners via trigger (Crucial for RBAC consistency)
-- This fixes the issue where a creator can see the project (via creator=uid) but is not a member.
CREATE OR REPLACE FUNCTION public.handle_new_project_creation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only for Root Projects
  IF NEW.root_id IS NULL AND NEW.parent_task_id IS NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (NEW.id, NEW.creator, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_add_project_owner ON public.tasks;
CREATE TRIGGER trg_auto_add_project_owner
AFTER INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_project_creation();
