-- Migration: Wave 22 — Coaching Task RLS
-- Date: 2026-04-17
-- Description:
--   Adds ONE additive RLS UPDATE policy on `public.tasks` so a user with the
--   `coach` role on a project can update tasks that have been explicitly
--   tagged as coaching via `settings ->> 'is_coaching_task'`. The existing
--   owner/editor/admin UPDATE policy is left untouched — coaches keep zero
--   access to non-coaching rows and to templates.
--
--   Closes the "Coach Role Tagging" known-gap bullet in
--   docs/architecture/auth-rbac.md and the Coaching half of §3.3 Specialized
--   Task Types in spec.md. The "Strategy Template" half stays deferred.
--
--   No new columns — the flag rides on the existing `settings` JSONB field.
--   Revert path: `DROP POLICY "Enable update for coaches on coaching tasks"
--   ON public.tasks;`

CREATE POLICY "Enable update for coaches on coaching tasks"
ON public.tasks
FOR UPDATE
USING (
    public.has_project_role(
        COALESCE(root_id, id),
        (SELECT (auth.jwt() ->> 'sub')::uuid),
        ARRAY['coach'::text]
    )
    AND ((settings ->> 'is_coaching_task')::bool IS TRUE)
    AND (origin IS DISTINCT FROM 'template'::text)
);
