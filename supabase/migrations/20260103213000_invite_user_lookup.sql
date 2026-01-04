-- Create a secure function to look up user ID by email
-- This is required because the Edge Function cannot access auth.users directly via REST

create or replace function public.get_user_id_by_email(email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from auth.users where email = $1;
$$;

-- Grant execution to service_role (Edge Functions use this)
grant execute on function public.get_user_id_by_email(text) to service_role;

-- Revoke from anon/authenticated to prevent public enumeration
revoke execute on function public.get_user_id_by_email(text) from anon, authenticated;
