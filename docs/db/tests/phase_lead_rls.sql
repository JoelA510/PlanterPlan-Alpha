-- EXPECT: viewer-with-phase-lead can update child task; cannot update sibling phase's child; cannot update phase row
--
-- Wave 29: manual psql smoke for the `user_is_phase_lead` helper + the
-- additive "Enable update for phase leads" RLS policy on public.tasks.
--
-- Prerequisites (run with the service-role key or as superuser for setup,
-- then reset-role before each USING-clause check):
--   - `viewer_uid` is an existing auth user id with role 'viewer' on `project_id`.
--   - `project_id` is a root task (parent_task_id IS NULL, origin='instance').
--   - Migration 2026_04_18_phase_lead_rls.sql has been applied.
--
-- Substitute uuids where noted, then run. Re-entrancy: wrap in BEGIN/ROLLBACK.

BEGIN;

-- SETUP: create a project, phase (milestone), a task under it, and a sibling phase
--        with its own task. Stamp `phase_lead_user_ids` on one phase only.

WITH v AS (
    SELECT
        '00000000-0000-0000-0000-00000000aaaa'::uuid AS project_id,
        '00000000-0000-0000-0000-00000000aabb'::uuid AS phase_a_id,
        '00000000-0000-0000-0000-00000000aacc'::uuid AS phase_b_id,
        '00000000-0000-0000-0000-00000000aadd'::uuid AS task_a_id,
        '00000000-0000-0000-0000-00000000aaee'::uuid AS task_b_id,
        '00000000-0000-0000-0000-00000000aaff'::uuid AS viewer_uid
)
INSERT INTO public.tasks (id, parent_task_id, root_id, title, origin, task_type, settings)
SELECT project_id, NULL, project_id, '[phase_lead smoke] project', 'instance', 'project', '{}'::jsonb FROM v
UNION ALL
SELECT phase_a_id, project_id, project_id, '[phase_lead smoke] phase A (with lead)', 'instance', 'phase',
    jsonb_build_object('phase_lead_user_ids', jsonb_build_array((SELECT viewer_uid FROM v)::text))
FROM v
UNION ALL
SELECT phase_b_id, project_id, project_id, '[phase_lead smoke] phase B (no lead)', 'instance', 'phase', '{}'::jsonb FROM v
UNION ALL
SELECT task_a_id, phase_a_id, project_id, '[phase_lead smoke] task under A', 'instance', 'task', '{}'::jsonb FROM v
UNION ALL
SELECT task_b_id, phase_b_id, project_id, '[phase_lead smoke] task under B', 'instance', 'task', '{}'::jsonb FROM v;

-- CASE 1: `user_is_phase_lead(task_a_id, viewer_uid)` → TRUE
DO $$
DECLARE
    ok boolean;
BEGIN
    SELECT public.user_is_phase_lead(
        '00000000-0000-0000-0000-00000000aadd'::uuid,
        '00000000-0000-0000-0000-00000000aaff'::uuid
    ) INTO ok;
    IF NOT ok THEN
        RAISE EXCEPTION '[FAIL] task_a should return TRUE (viewer is lead of phase A)';
    END IF;
    RAISE NOTICE '[OK] task_a returned TRUE';
END $$;

-- CASE 2: `user_is_phase_lead(task_b_id, viewer_uid)` → FALSE
DO $$
DECLARE
    ok boolean;
BEGIN
    SELECT public.user_is_phase_lead(
        '00000000-0000-0000-0000-00000000aaee'::uuid,
        '00000000-0000-0000-0000-00000000aaff'::uuid
    ) INTO ok;
    IF ok THEN
        RAISE EXCEPTION '[FAIL] task_b should return FALSE (sibling phase has no lead assignment)';
    END IF;
    RAISE NOTICE '[OK] task_b returned FALSE';
END $$;

-- CASE 3: `user_is_phase_lead(phase_a_id, viewer_uid)` → TRUE
-- (the recursive CTE's base row is the task itself, and phase A carries the settings)
DO $$
DECLARE
    ok boolean;
BEGIN
    SELECT public.user_is_phase_lead(
        '00000000-0000-0000-0000-00000000aabb'::uuid,
        '00000000-0000-0000-0000-00000000aaff'::uuid
    ) INTO ok;
    IF NOT ok THEN
        RAISE EXCEPTION '[FAIL] phase_a self-match should return TRUE';
    END IF;
    RAISE NOTICE '[OK] phase_a self-match returned TRUE';
END $$;

-- NOTE: policy-level UPDATE checks require `SET ROLE` to a non-service user
-- and the auth.uid() JWT to match viewer_uid. Run that section manually in
-- a connected psql session after setting the role + JWT claim headers,
-- then assert the UPDATE on task_a succeeds and on task_b fails.
--
-- Clean up the seeded rows regardless of whether the policy section ran.

DELETE FROM public.tasks WHERE title LIKE '[phase_lead smoke]%';

COMMIT;
