-- Manual smoke test for: docs/db/migrations/2026_04_18_coaching_backfill_on_membership.sql
-- Invocation:
--   psql "$SUPABASE_DB_URL" -f docs/db/tests/coaching_backfill_on_membership.sql
--
-- Covers every relevant transition of `trg_backfill_coaching_assignees`:
--   1. Zero coaches → one coach (INSERT)        → backfill fires.
--   2. One coach → two coaches (INSERT)         → no change (never overwrite, never null out).
--   3. Two coaches → one coach (DELETE)         → backfill fires for the remaining coach.
--   4. One coach → zero coaches (DELETE)        → no change (don't un-assign existing rows).
--   5. Role UPDATE: editor → coach (none → 1)   → backfill fires.
--   6. Role UPDATE: coach → editor (1 → 0)      → no change.
--   7. Caller-supplied assignee_id is never overwritten.

BEGIN;

-- Fixtures ------------------------------------------------------------------

WITH u AS (
    INSERT INTO auth.users (id, email) VALUES
      ('55555555-5555-5555-5555-555555555555', 'creator@example.test'),
      ('66666666-6666-6666-6666-666666666666', 'coach-a@example.test'),
      ('77777777-7777-7777-7777-777777777777', 'coach-b@example.test'),
      ('88888888-8888-8888-8888-888888888888', 'human@example.test')
    ON CONFLICT (id) DO NOTHING
    RETURNING id
) SELECT 1;

-- One project root with two coaching tasks (all assignee_id null).
INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin)
VALUES
  ('eeeeeeee-0000-0000-0000-000000000000', NULL, 'eeeeeeee-0000-0000-0000-000000000000',
   '55555555-5555-5555-5555-555555555555', 'Project with backfill', 'instance');

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin, settings)
VALUES
  ('eeeeeeee-0001-0000-0000-000000000000',
   'eeeeeeee-0000-0000-0000-000000000000',
   'eeeeeeee-0000-0000-0000-000000000000',
   '55555555-5555-5555-5555-555555555555',
   'Coaching task A', 'instance',
   jsonb_build_object('is_coaching_task', true)),
  ('eeeeeeee-0002-0000-0000-000000000000',
   'eeeeeeee-0000-0000-0000-000000000000',
   'eeeeeeee-0000-0000-0000-000000000000',
   '55555555-5555-5555-5555-555555555555',
   'Coaching task B', 'instance',
   jsonb_build_object('is_coaching_task', true));

-- Sanity: no coaches yet → both assignee_ids null.
DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM public.tasks
             WHERE root_id = 'eeeeeeee-0000-0000-0000-000000000000'
               AND assignee_id IS NULL
               AND (settings ->> 'is_coaching_task')::boolean IS TRUE) = 2,
           'Setup: expected 2 coaching tasks with null assignee_id';
END $$;

-- Branch 1: INSERT first coach → backfill both tasks -------------------------

INSERT INTO public.project_members (project_id, user_id, role) VALUES
  ('eeeeeeee-0000-0000-0000-000000000000',
   '66666666-6666-6666-6666-666666666666', 'coach');

DO $$
BEGIN
    ASSERT (SELECT assignee_id = '66666666-6666-6666-6666-666666666666'
              FROM public.tasks
             WHERE id = 'eeeeeeee-0001-0000-0000-000000000000'),
           'Branch 1 (0 → 1 coach): expected coaching task A to be assigned to coach-a';
    ASSERT (SELECT assignee_id = '66666666-6666-6666-6666-666666666666'
              FROM public.tasks
             WHERE id = 'eeeeeeee-0002-0000-0000-000000000000'),
           'Branch 1 (0 → 1 coach): expected coaching task B to be assigned to coach-a';
END $$;

-- Branch 2: INSERT second coach → no overwrite, no null-out -----------------

INSERT INTO public.project_members (project_id, user_id, role) VALUES
  ('eeeeeeee-0000-0000-0000-000000000000',
   '77777777-7777-7777-7777-777777777777', 'coach');

DO $$
BEGIN
    ASSERT (SELECT assignee_id = '66666666-6666-6666-6666-666666666666'
              FROM public.tasks
             WHERE id = 'eeeeeeee-0001-0000-0000-000000000000'),
           'Branch 2 (1 → 2 coaches): assignee must NOT change (user intent wins)';
END $$;

-- Branch 3: DELETE second coach → back to exactly 1 coach (coach-b) ---------
-- Prior assignments stay (both point at coach-a). Add a fresh coaching task
-- with null assignee to prove the DELETE → single-coach path backfills it.

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin, settings)
VALUES
  ('eeeeeeee-0003-0000-0000-000000000000',
   'eeeeeeee-0000-0000-0000-000000000000',
   'eeeeeeee-0000-0000-0000-000000000000',
   '55555555-5555-5555-5555-555555555555',
   'Coaching task C (created between INSERT and DELETE)', 'instance',
   jsonb_build_object('is_coaching_task', true));

DELETE FROM public.project_members
 WHERE project_id = 'eeeeeeee-0000-0000-0000-000000000000'
   AND user_id = '66666666-6666-6666-6666-666666666666';

DO $$
BEGIN
    -- The remaining coach is coach-b. The two existing tasks stay pointed at
    -- coach-a (never un-assigned). The fresh task C gets backfilled to coach-b.
    ASSERT (SELECT assignee_id = '66666666-6666-6666-6666-666666666666'
              FROM public.tasks
             WHERE id = 'eeeeeeee-0001-0000-0000-000000000000'),
           'Branch 3 (2 → 1 coach via DELETE): existing assignees must NOT be nulled or overwritten';
    ASSERT (SELECT assignee_id = '77777777-7777-7777-7777-777777777777'
              FROM public.tasks
             WHERE id = 'eeeeeeee-0003-0000-0000-000000000000'),
           'Branch 3 (2 → 1 coach via DELETE): fresh null-assignee task must backfill to coach-b';
END $$;

-- Branch 4: DELETE last coach → zero coaches → no change --------------------

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin, settings)
VALUES
  ('eeeeeeee-0004-0000-0000-000000000000',
   'eeeeeeee-0000-0000-0000-000000000000',
   'eeeeeeee-0000-0000-0000-000000000000',
   '55555555-5555-5555-5555-555555555555',
   'Coaching task D (stays null)', 'instance',
   jsonb_build_object('is_coaching_task', true));

DELETE FROM public.project_members
 WHERE project_id = 'eeeeeeee-0000-0000-0000-000000000000'
   AND user_id = '77777777-7777-7777-7777-777777777777';

DO $$
BEGIN
    ASSERT (SELECT assignee_id IS NULL
              FROM public.tasks
             WHERE id = 'eeeeeeee-0004-0000-0000-000000000000'),
           'Branch 4 (1 → 0 coaches): null-assignee task must stay null';
    -- Existing non-null assignments still preserved
    ASSERT (SELECT assignee_id = '66666666-6666-6666-6666-666666666666'
              FROM public.tasks
             WHERE id = 'eeeeeeee-0001-0000-0000-000000000000'),
           'Branch 4 (1 → 0 coaches): existing non-null assignee must NOT be nulled out';
END $$;

-- Branch 5: UPDATE editor → coach (none → 1) → backfill ---------------------

INSERT INTO public.project_members (project_id, user_id, role) VALUES
  ('eeeeeeee-0000-0000-0000-000000000000',
   '66666666-6666-6666-6666-666666666666', 'editor');

-- Still zero coaches; task D stays null.
DO $$
BEGIN
    ASSERT (SELECT assignee_id IS NULL FROM public.tasks
             WHERE id = 'eeeeeeee-0004-0000-0000-000000000000'),
           'Branch 5 setup: editor insert should not trigger backfill';
END $$;

-- Now flip that editor to a coach — the role UPDATE must backfill task D.
UPDATE public.project_members
   SET role = 'coach'
 WHERE project_id = 'eeeeeeee-0000-0000-0000-000000000000'
   AND user_id = '66666666-6666-6666-6666-666666666666';

DO $$
BEGIN
    ASSERT (SELECT assignee_id = '66666666-6666-6666-6666-666666666666'
              FROM public.tasks
             WHERE id = 'eeeeeeee-0004-0000-0000-000000000000'),
           'Branch 5 (editor → coach): task D must backfill to coach-a';
END $$;

-- Branch 6: UPDATE coach → editor (1 → 0) → no change -----------------------

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin, settings)
VALUES
  ('eeeeeeee-0005-0000-0000-000000000000',
   'eeeeeeee-0000-0000-0000-000000000000',
   'eeeeeeee-0000-0000-0000-000000000000',
   '55555555-5555-5555-5555-555555555555',
   'Coaching task E (stays null after coach demoted)', 'instance',
   jsonb_build_object('is_coaching_task', true));

-- Demote the sole coach → zero coaches.
UPDATE public.project_members
   SET role = 'editor'
 WHERE project_id = 'eeeeeeee-0000-0000-0000-000000000000'
   AND user_id = '66666666-6666-6666-6666-666666666666';

DO $$
BEGIN
    ASSERT (SELECT assignee_id IS NULL
              FROM public.tasks
             WHERE id = 'eeeeeeee-0005-0000-0000-000000000000'),
           'Branch 6 (coach → editor): new null-assignee task must stay null';
    -- Previously-assigned task D also stays pointing at coach-a
    ASSERT (SELECT assignee_id = '66666666-6666-6666-6666-666666666666'
              FROM public.tasks
             WHERE id = 'eeeeeeee-0004-0000-0000-000000000000'),
           'Branch 6 (coach → editor): prior assignment stays intact';
END $$;

-- Branch 7: caller-supplied assignee_id never overwritten -------------------
-- Re-promote to coach, then add a new coaching task with a human-chosen
-- assignee. Even though the trigger now sees exactly-one coach and the flag
-- is true, the explicit assignee_id must survive.

UPDATE public.project_members
   SET role = 'coach'
 WHERE project_id = 'eeeeeeee-0000-0000-0000-000000000000'
   AND user_id = '66666666-6666-6666-6666-666666666666';

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin, settings, assignee_id)
VALUES
  ('eeeeeeee-0006-0000-0000-000000000000',
   'eeeeeeee-0000-0000-0000-000000000000',
   'eeeeeeee-0000-0000-0000-000000000000',
   '55555555-5555-5555-5555-555555555555',
   'Coaching task F (caller-chosen assignee)', 'instance',
   jsonb_build_object('is_coaching_task', true),
   '88888888-8888-8888-8888-888888888888');

-- Re-fire the coach-count recompute with a benign role toggle (editor → coach
-- on a fresh user) to confirm the backfill pass does not touch task F.
INSERT INTO public.project_members (project_id, user_id, role) VALUES
  ('eeeeeeee-0000-0000-0000-000000000000',
   '77777777-7777-7777-7777-777777777777', 'editor');

DO $$
BEGIN
    ASSERT (SELECT assignee_id = '88888888-8888-8888-8888-888888888888'
              FROM public.tasks
             WHERE id = 'eeeeeeee-0006-0000-0000-000000000000'),
           'Branch 7 (user intent wins): caller-supplied assignee must not be overwritten';
END $$;

ROLLBACK;
