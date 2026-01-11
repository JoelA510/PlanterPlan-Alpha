-- Fix missing grant for clone_project_template
GRANT EXECUTE ON FUNCTION public.clone_project_template(uuid, uuid, text, uuid, text, text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clone_project_template(uuid, uuid, text, uuid, text, text, timestamptz, timestamptz) TO service_role;
