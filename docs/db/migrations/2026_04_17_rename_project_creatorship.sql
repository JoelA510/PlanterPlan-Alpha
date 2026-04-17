-- Migration: Wave 23 — Rename check_project_ownership → check_project_creatorship
-- Date: 2026-04-17
-- Description:
--   The existing `public.check_project_ownership(p_id, u_id)` function is
--   misleadingly named: it actually checks `tasks.creator = u_id`, not the
--   `owner` role on `project_members`. Every RLS policy that references it on
--   `public.project_members` is making a decision that does not match the
--   function's name, so the name has been a latent auth footgun since Wave 1.
--
--   This migration is **audit-only** — no behavior change:
--     1. Introduces `public.check_project_creatorship(p_id, u_id)` with the
--        exact body of today's `check_project_ownership`.
--     2. Converts `public.check_project_ownership` to a thin SQL shim that
--        delegates to the new function. The four existing RLS policies on
--        `project_members` continue calling the shim unchanged, so runtime
--        semantics are byte-for-byte identical.
--
--   The per-callsite intent audit (creatorship vs. ownership) is captured in
--   docs/architecture/auth-rbac.md and as inline comments in docs/db/schema.sql.
--   A follow-up wave will rewrite each policy to the correct helper and, once
--   that lands, drop the shim.
--
--   Revert path:
--     Restore the previous plpgsql body of public.check_project_ownership from
--     git history (see commit prior to this migration) and
--     `DROP FUNCTION IF EXISTS public.check_project_creatorship(uuid, uuid);`.

-- 1. New, correctly-named implementation ------------------------------------

CREATE OR REPLACE FUNCTION public.check_project_creatorship(p_id uuid, u_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE id = p_id
      AND creator = u_id
  );
END;
$$;

ALTER FUNCTION public.check_project_creatorship(uuid, uuid) OWNER TO postgres;

-- 2. Backwards-compatibility shim ------------------------------------------
--
-- Keeps the old name resolvable by existing RLS policies and any yet-undiscovered
-- external caller. Drop once every callsite has migrated to the new name in a
-- follow-up wave.

CREATE OR REPLACE FUNCTION public.check_project_ownership(p_id uuid, u_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.check_project_creatorship(p_id, u_id);
$$;

ALTER FUNCTION public.check_project_ownership(uuid, uuid) OWNER TO postgres;

COMMENT ON FUNCTION public.check_project_ownership(uuid, uuid) IS
  'Deprecated shim (Wave 23). Delegates to public.check_project_creatorship. Kept one release for the RLS policy audit; drop once every callsite migrates.';
