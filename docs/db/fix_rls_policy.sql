-- Re-apply TASKS Insert Policy with explicit Root Project permission
DROP POLICY IF EXISTS "Enable insert for authenticated users within project" ON public.tasks;

CREATE POLICY "Enable insert for authenticated users within project" ON public.tasks 
FOR INSERT WITH CHECK (
    (
        -- Allow Root Project Creation (No parent, No root default, Creator match)
        (auth.role() = 'authenticated' AND root_id IS NULL AND parent_task_id IS NULL AND creator = auth.uid())
        OR
        -- Allow Child Task Creation (Member of Project)
        public.has_project_role(root_id, auth.uid(), ARRAY['owner', 'editor'])
    )
    AND 
    (
        -- Prevent Template hijacking
        origin IS DISTINCT FROM 'template' 
        OR 
        public.is_admin(auth.uid())
    )
);
