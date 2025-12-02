-- P2-DB-RLS-POLICIES
-- Enable RLS on tasks table if not already enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: select_joined_projects
-- Users can SELECT tasks where their UID is in project_members for the associated project
CREATE POLICY "select_joined_projects" ON tasks
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM project_members WHERE project_id = tasks.project_id
  )
);
