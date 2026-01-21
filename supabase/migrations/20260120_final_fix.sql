-- Final Security Fix & Cleanup
-- Date: 2026-01-20

-- 1. Reload PostgREST Schema Cache (Fixes RPC "function not found")
NOTIFY pgrst, 'reload';

-- 2. Grant Permissions (Ensure function is callable)
GRANT EXECUTE ON FUNCTION public.has_project_role(uuid, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_project_role(uuid, uuid, text[]) TO service_role;

-- 3. Force Drop ALL potential policies on tasks to be absolutely sure
DROP POLICY IF EXISTS "Enable insert for authenticated users within project" ON public.tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable insert for users" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated can insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;

-- 4. Re-Apply Secure INSERT Policy
CREATE POLICY "Enable insert for authenticated users within project" ON public.tasks 
FOR INSERT WITH CHECK (
    -- Must have write access to the project (Root ID)
    public.has_project_role(root_id, auth.uid(), ARRAY['owner', 'editor'])
);

-- 5. Helper: Ensure root_id is required for new secure world?
-- (Optional, but good practice. For now, we trust the policy).
