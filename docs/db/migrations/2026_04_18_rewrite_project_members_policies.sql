-- Migration: Wave 24 — Rewrite project_members RLS policies + drop ownership shim
-- Date: 2026-04-18
-- Description:
--   Closes the "behavior-change still deferred" half of the
--   `check_project_ownership` dev-notes entry that Wave 23 only renamed. Wave
--   23 introduced `check_project_creatorship(pid, uid)` as the correctly-named
--   holder of the original body and kept `check_project_ownership` as a SQL
--   shim delegating to it so the four RLS policies on `public.project_members`
--   could be rewritten later (this wave).
--
--   Audit outcomes (see docs/architecture/auth-rbac.md — Wave 23 table):
--     * members_insert_policy   → use check_project_creatorship directly
--                                 (bootstrap: creator self-inserts the first
--                                  owner row before any owner exists).
--     * members_select_policy   → drop the creatorship branch entirely
--                                 (is_active_member + self-row cover every
--                                  legitimate read; creatorship branch only
--                                  ever fired for removed creators — the
--                                  documented leak).
--     * members_delete_policy   → replace with a genuine ownership check
--                                 against project_members.role = 'owner'.
--     * members_update_policy   → same as DELETE (ownership intent).
--
--   Supporting addition:
--     `public.check_project_ownership_by_role(pid, uid)` centralises the
--     DELETE/UPDATE ownership check so the two callsites share one
--     implementation.
--
--   Shim removal:
--     `public.check_project_ownership(pid, uid)` is DROPPED. A codebase-wide
--     search (src/**, supabase/**) confirmed zero app callers before this
--     migration — the shim existed only for the four RLS policies, which are
--     rewritten above.
--
--   Revert path:
--     1. DROP each new policy.
--     2. Recreate the old policies as they appeared in Wave 23 (see
--        docs/db/schema.sql history or 2026_04_17_rename_project_creatorship.sql).
--     3. Recreate `public.check_project_ownership(pid, uid)` as a SQL shim
--        delegating to `public.check_project_creatorship` (the Wave 23 body).
--     4. DROP FUNCTION public.check_project_ownership_by_role(uuid, uuid);

-- 1. New ownership helper --------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_project_ownership_by_role(p_id uuid, u_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Canonical ownership check: u_id currently holds the `owner` role on the
  -- project. Unlike `check_project_creatorship`, a user who is removed from
  -- project_members stops passing this check. STABLE so the planner can cache
  -- the result across a single RLS policy evaluation.
  RETURN EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_id
      AND user_id    = u_id
      AND role       = 'owner'
  );
END;
$$;

ALTER FUNCTION public.check_project_ownership_by_role(uuid, uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.check_project_ownership_by_role(uuid, uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_project_ownership_by_role(uuid, uuid) TO "authenticated";

-- 2. Rewrite the four project_members policies ----------------------------

DROP POLICY IF EXISTS "members_insert_policy" ON public.project_members;
DROP POLICY IF EXISTS "members_select_policy" ON public.project_members;
DROP POLICY IF EXISTS "members_delete_policy" ON public.project_members;
DROP POLICY IF EXISTS "members_update_policy" ON public.project_members;

-- INSERT: creatorship (bootstrap) — the project creator self-inserts the
-- initial `owner` row before any owner-role row exists. Switch to the
-- correctly-named helper; keep the `role = 'owner'` delegated path for
-- subsequent member adds.
CREATE POLICY "members_insert_policy" ON public.project_members
  FOR INSERT
  WITH CHECK (
    public.check_project_creatorship(
      project_id,
      (SELECT (auth.jwt() ->> 'sub')::uuid)
    )
    OR project_id IN (
      SELECT pm.project_id
        FROM public.project_members pm
       WHERE pm.user_id = (SELECT (auth.jwt() ->> 'sub')::uuid)
         AND pm.role    = 'owner'
    )
  );

-- SELECT: is_active_member + self-row cover every legitimate read. The
-- creatorship branch only fired for removed creators (the documented leak)
-- — dropped.
CREATE POLICY "members_select_policy" ON public.project_members
  FOR SELECT
  USING (
    user_id = (SELECT (auth.jwt() ->> 'sub')::uuid)
    OR public.is_active_member(
      project_id,
      (SELECT (auth.jwt() ->> 'sub')::uuid)
    )
  );

-- DELETE: genuine ownership via the new helper. A removed former creator
-- no longer passes. Preserves the self-row delete path (user removing
-- themselves from a project) that the Wave 23 policy also allowed.
CREATE POLICY "members_delete_policy" ON public.project_members
  FOR DELETE
  USING (
    user_id = (SELECT (auth.jwt() ->> 'sub')::uuid)
    OR public.check_project_ownership_by_role(
      project_id,
      (SELECT (auth.jwt() ->> 'sub')::uuid)
    )
  );

-- UPDATE: same ownership rewrite. WITH CHECK preserves the Wave 23 invariant
-- that a user can't self-demote to `viewer` (i.e. the update is legal only
-- if it doesn't turn the current caller into a viewer).
CREATE POLICY "members_update_policy" ON public.project_members
  FOR UPDATE
  USING (
    public.check_project_ownership_by_role(
      project_id,
      (SELECT (auth.jwt() ->> 'sub')::uuid)
    )
  )
  WITH CHECK (
    user_id <> (SELECT (auth.jwt() ->> 'sub')::uuid)
    OR role <> 'viewer'::text
  );

-- 3. Drop the shim --------------------------------------------------------

DROP FUNCTION public.check_project_ownership(uuid, uuid);
