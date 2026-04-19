-- Migration: Wave 29 — Phase Lead RLS for limited viewers
-- Date: 2026-04-18
-- Description:
--   Adds `user_is_phase_lead(target_task_id uuid, uid uuid)` SECURITY DEFINER
--   helper that walks up the parent_task_id chain looking for any ancestor whose
--   `settings -> 'phase_lead_user_ids'` contains uid. Adds an additive RLS UPDATE
--   policy on public.tasks letting users update tasks under any phase/milestone
--   they're a Phase Lead for. Mirrors the Wave 22 coaching policy precedent.
--
--   No SELECT change — viewers already have project-wide SELECT.
--
-- Revert path:
--   DROP POLICY IF EXISTS "Enable update for phase leads" ON public.tasks;
--   DROP FUNCTION IF EXISTS public.user_is_phase_lead(uuid, uuid);

CREATE OR REPLACE FUNCTION public.user_is_phase_lead(target_task_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  WITH RECURSIVE ancestors AS (
    SELECT id, parent_task_id, settings
    FROM public.tasks
    WHERE id = target_task_id
    UNION ALL
    SELECT t.id, t.parent_task_id, t.settings
    FROM public.tasks t
    JOIN ancestors a ON t.id = a.parent_task_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM ancestors
    WHERE settings ? 'phase_lead_user_ids'
      AND (settings -> 'phase_lead_user_ids') ? uid::text
  );
$$;

REVOKE ALL ON FUNCTION public.user_is_phase_lead(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_phase_lead(uuid, uuid) TO authenticated;

CREATE POLICY "Enable update for phase leads"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  origin = 'instance'
  AND public.user_is_phase_lead(id, auth.uid())
)
WITH CHECK (
  origin = 'instance'
  AND public.user_is_phase_lead(id, auth.uid())
);
