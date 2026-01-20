-- Force Cleanup of Insecure Policies
-- Date: 2026-01-20

-- 1. Ensure RLS is enabled
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential insecure policies (variations in naming)
DROP POLICY IF EXISTS "Enable insert for authenticated users within project" ON public.tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable insert for users" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated can insert" ON public.tasks;

-- Drop legacy/duplicate policies found via inspection
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
DROP POLICY IF EXISTS "task_resources_select_policy" ON public.task_resources;
DROP POLICY IF EXISTS "task_resources_modify_policy" ON public.task_resources;

-- 3. Re-apply Secure Policy
-- This matches schema.sql exactly
CREATE POLICY "Enable insert for authenticated users within project" ON public.tasks 
FOR INSERT WITH CHECK (
    -- Must have write access to the project (Root ID)
    public.has_project_role(root_id, auth.uid(), ARRAY['owner', 'editor'])
);

-- 4. Verify Project Members Policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.project_members;

CREATE POLICY "Enable all for authenticated users" ON public.project_members 
FOR ALL USING (
    -- Only Owners can manage members
    public.has_project_role(project_id, auth.uid(), ARRAY['owner'])
    OR
    public.is_admin(auth.uid())
);
