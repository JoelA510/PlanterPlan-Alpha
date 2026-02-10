-- RLS Optimization: Replace auth.uid() with (select auth.uid()) for query plan caching
-- Generated: 2026-02-09

-- ============================================================================
-- TASKS Table Policies
-- ============================================================================

DROP POLICY IF EXISTS "Enable read access for all users" ON public.tasks;
CREATE POLICY "Enable read access for all users" ON public.tasks 
FOR SELECT USING (
    creator = (select auth.uid())
    OR 
    public.has_project_role(COALESCE(root_id, id), (select auth.uid()), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited'])
);

DROP POLICY IF EXISTS "Enable insert for authenticated users within project" ON public.tasks;
CREATE POLICY "Enable insert for authenticated users within project" ON public.tasks 
FOR INSERT WITH CHECK (
    (auth.role() = 'authenticated' AND root_id IS NULL AND parent_task_id IS NULL AND creator = (select auth.uid()))
    OR
    public.has_project_role(root_id, (select auth.uid()), ARRAY['owner', 'editor'])
);

DROP POLICY IF EXISTS "Enable update for users" ON public.tasks;
CREATE POLICY "Enable update for users" ON public.tasks 
FOR UPDATE USING (
    creator = (select auth.uid())
    OR 
    public.has_project_role(COALESCE(root_id, id), (select auth.uid()), ARRAY['owner', 'editor'])
);

DROP POLICY IF EXISTS "Enable delete for users" ON public.tasks;
CREATE POLICY "Enable delete for users" ON public.tasks 
FOR DELETE USING (
    creator = (select auth.uid())
    OR 
    public.has_project_role(COALESCE(root_id, id), (select auth.uid()), ARRAY['owner', 'editor'])
);

-- ============================================================================
-- PROJECT MEMBERS Table Policies
-- ============================================================================

DROP POLICY IF EXISTS "View project members" ON public.project_members;
CREATE POLICY "View project members" ON public.project_members
  FOR SELECT USING (
    public.has_project_role(project_id, (select auth.uid()), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited']) OR
    public.is_admin((select auth.uid()))
  );
  
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.project_members;
CREATE POLICY "Enable all for authenticated users" ON public.project_members 
FOR ALL USING (
    public.has_project_role(project_id, (select auth.uid()), ARRAY['owner'])
    OR
    public.is_admin((select auth.uid()))
);

-- ============================================================================
-- PROJECT INVITES Table Policies
-- ============================================================================

DROP POLICY IF EXISTS "View invites for project members" ON public.project_invites;
CREATE POLICY "View invites for project members" ON public.project_invites
  FOR SELECT USING (
    public.has_project_role(project_id, (select auth.uid()), ARRAY['owner', 'editor']) OR
    public.is_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "Create invites for project members" ON public.project_invites;
CREATE POLICY "Create invites for project members" ON public.project_invites
  FOR INSERT WITH CHECK (
    public.has_project_role(project_id, (select auth.uid()), ARRAY['owner', 'editor']) OR
    public.is_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "Delete invites for project members" ON public.project_invites;
CREATE POLICY "Delete invites for project members" ON public.project_invites
  FOR DELETE USING (
    public.has_project_role(project_id, (select auth.uid()), ARRAY['owner', 'editor']) OR
    public.is_admin((select auth.uid()))
  );

-- ============================================================================
-- PEOPLE Table Policies
-- ============================================================================

DROP POLICY IF EXISTS "View people for project members" ON public.people;
CREATE POLICY "View people for project members" ON public.people
  FOR SELECT USING (
    public.has_project_role(project_id, (select auth.uid()), ARRAY['owner', 'editor', 'coach', 'viewer', 'limited']) OR
    public.is_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "Manage people for owners and editors" ON public.people;
CREATE POLICY "Manage people for owners and editors" ON public.people
  FOR ALL USING (
    public.has_project_role(project_id, (select auth.uid()), ARRAY['owner', 'editor']) OR
    public.is_admin((select auth.uid()))
  );

-- ============================================================================
-- TASK RELATIONSHIPS Table Policies
-- ============================================================================

DROP POLICY IF EXISTS "View relationships" ON public.task_relationships;
CREATE POLICY "View relationships" ON public.task_relationships
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = task_relationships.project_id
            AND project_members.user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Manage relationships" ON public.task_relationships;
CREATE POLICY "Manage relationships" ON public.task_relationships
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = task_relationships.project_id
            AND project_members.user_id = (select auth.uid())
            AND project_members.role IN ('owner', 'editor')
        )
    );
