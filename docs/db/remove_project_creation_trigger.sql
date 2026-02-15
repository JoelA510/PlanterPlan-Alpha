-- Remove redundant project creation trigger and function
-- This trigger conflicts with initialize_default_project and causes RLS violations

-- 1. Drop the trigger
DROP TRIGGER IF EXISTS trg_auto_add_project_owner ON public.tasks;

-- 2. Drop the function
DROP FUNCTION IF EXISTS public.handle_new_project_creation();

-- 3. Ensure initialize_default_project is accessible and secure
-- (It should already be SECURITY DEFINER, but let's be safe and explicit)
ALTER FUNCTION public.initialize_default_project(uuid, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.initialize_default_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_default_project(uuid, uuid) TO service_role;
