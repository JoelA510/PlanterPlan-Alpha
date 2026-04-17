-- Manual smoke test for: docs/db/migrations/2026_04_17_coaching_auto_assign.sql
-- Invocation (against a disposable local Supabase):
--   psql "$SUPABASE_DB_URL" -f docs/db/tests/coaching_auto_assign.sql
--
-- Covers the three branches of the `set_coaching_assignee` trigger:
--   1. Zero coaches  → assignee_id stays NULL.
--   2. One coach     → assignee_id auto-assigned to that coach.
--   3. Two coaches   → assignee_id stays NULL (ambiguous, no-op).
--   4. Caller-supplied assignee_id is never overwritten.

BEGIN;

-- Fixtures -------------------------------------------------------------------

-- Two auth users standing in for coaches, plus one project creator.
WITH
  u AS (
    INSERT INTO auth.users (id, email) VALUES
      ('11111111-1111-1111-1111-111111111111', 'creator@example.test'),
      ('22222222-2222-2222-2222-222222222222', 'coach1@example.test'),
      ('33333333-3333-3333-3333-333333333333', 'coach2@example.test'),
      ('44444444-4444-4444-4444-444444444444', 'assignee@example.test')
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  )
SELECT 1;

-- Three projects: zero / one / two coaches. Creator is also an owner member so
-- the RLS boot path exists; the trigger we're testing doesn't depend on RLS.
INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', NULL, 'aaaaaaaa-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'Project Zero Coaches', 'instance'),
  ('bbbbbbbb-0000-0000-0000-000000000000', NULL, 'bbbbbbbb-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'Project One Coach', 'instance'),
  ('cccccccc-0000-0000-0000-000000000000', NULL, 'cccccccc-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'Project Two Coaches', 'instance');

INSERT INTO public.project_members (project_id, user_id, role) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'coach'),
  ('cccccccc-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'coach'),
  ('cccccccc-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'coach');

-- Branch 1: zero coaches -> assignee_id stays NULL ---------------------------

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin, settings)
VALUES
  ('aaaaaaaa-0001-0000-0000-000000000000',
   'aaaaaaaa-0000-0000-0000-000000000000',
   'aaaaaaaa-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'Coaching task on zero-coach project', 'instance',
   jsonb_build_object('is_coaching_task', true));

DO $$
BEGIN
    ASSERT (SELECT assignee_id IS NULL
              FROM public.tasks
             WHERE id = 'aaaaaaaa-0001-0000-0000-000000000000'),
           'Branch 1 (zero coaches): expected assignee_id IS NULL';
END $$;

-- Branch 2: one coach -> assignee_id == that coach ---------------------------

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin, settings)
VALUES
  ('bbbbbbbb-0001-0000-0000-000000000000',
   'bbbbbbbb-0000-0000-0000-000000000000',
   'bbbbbbbb-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'Coaching task on one-coach project', 'instance',
   jsonb_build_object('is_coaching_task', true));

DO $$
BEGIN
    ASSERT (SELECT assignee_id = '22222222-2222-2222-2222-222222222222'
              FROM public.tasks
             WHERE id = 'bbbbbbbb-0001-0000-0000-000000000000'),
           'Branch 2 (one coach): expected assignee_id = coach1';
END $$;

-- Branch 3: two coaches -> assignee_id stays NULL ----------------------------

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin, settings)
VALUES
  ('cccccccc-0001-0000-0000-000000000000',
   'cccccccc-0000-0000-0000-000000000000',
   'cccccccc-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'Coaching task on two-coach project', 'instance',
   jsonb_build_object('is_coaching_task', true));

DO $$
BEGIN
    ASSERT (SELECT assignee_id IS NULL
              FROM public.tasks
             WHERE id = 'cccccccc-0001-0000-0000-000000000000'),
           'Branch 3 (two coaches): expected assignee_id IS NULL';
END $$;

-- Branch 4: caller-supplied assignee_id is never overwritten -----------------

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin, settings, assignee_id)
VALUES
  ('bbbbbbbb-0002-0000-0000-000000000000',
   'bbbbbbbb-0000-0000-0000-000000000000',
   'bbbbbbbb-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'Coaching task with caller-chosen assignee', 'instance',
   jsonb_build_object('is_coaching_task', true),
   '44444444-4444-4444-4444-444444444444');

DO $$
BEGIN
    ASSERT (SELECT assignee_id = '44444444-4444-4444-4444-444444444444'
              FROM public.tasks
             WHERE id = 'bbbbbbbb-0002-0000-0000-000000000000'),
           'Branch 4 (user intent wins): expected assignee_id = caller choice';
END $$;

-- Branch 5: UPDATE flipping flag falsy -> true on row with NULL assignee -----

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin)
VALUES
  ('bbbbbbbb-0003-0000-0000-000000000000',
   'bbbbbbbb-0000-0000-0000-000000000000',
   'bbbbbbbb-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'Non-coaching task that will become coaching', 'instance');

UPDATE public.tasks
   SET settings = jsonb_build_object('is_coaching_task', true)
 WHERE id = 'bbbbbbbb-0003-0000-0000-000000000000';

DO $$
BEGIN
    ASSERT (SELECT assignee_id = '22222222-2222-2222-2222-222222222222'
              FROM public.tasks
             WHERE id = 'bbbbbbbb-0003-0000-0000-000000000000'),
           'Branch 5 (flag flip on update): expected assignee_id = coach1';
END $$;

-- Branch 6: INSERT subtask with ONLY parent_task_id (no root_id supplied) --
-- Exercises the trigger's parent_task_id → root_id lookup path. Without the
-- walk in `set_coaching_assignee`, the coach query would target `NEW.id`
-- (since trg_set_coaching_assignee runs alphabetically BEFORE
-- trg_set_root_id_from_parent) and return zero rows even though the project
-- has exactly one coach.

INSERT INTO public.tasks (id, parent_task_id, creator, title, origin, settings)
VALUES
  ('bbbbbbbb-0004-0000-0000-000000000000',
   'bbbbbbbb-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'Coaching subtask without root_id', 'instance',
   jsonb_build_object('is_coaching_task', true));

DO $$
BEGIN
    ASSERT (SELECT assignee_id = '22222222-2222-2222-2222-222222222222'
              FROM public.tasks
             WHERE id = 'bbbbbbbb-0004-0000-0000-000000000000'),
           'Branch 6 (subtask, no root_id): expected assignee_id = coach1 via parent_task_id lookup';
END $$;

-- Always roll back — this is a smoke test, not a seeded migration.
ROLLBACK;
