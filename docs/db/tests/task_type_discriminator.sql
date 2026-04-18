-- Manual smoke test for: docs/db/migrations/2026_04_18_task_type_discriminator.sql
-- Invocation:
--   psql "$SUPABASE_DB_URL" -f docs/db/tests/task_type_discriminator.sql
--
-- Covers every depth + reparent case of `trg_set_task_type`:
--   1. Backfill pass left no `task_type IS NULL` rows.
--   2. INSERT project root                  → 'project'
--   3. INSERT child of project               → 'phase'
--   4. INSERT grandchild (under phase)       → 'milestone'
--   5. INSERT great-grandchild               → 'task'
--   6. UPDATE parent_task_id (reparent a
--      milestone to a different phase)       → task_type recomputes to 'milestone'
--   7. UPDATE parent_task_id (nest a phase
--      under another phase)                  → task_type recomputes to 'milestone'

BEGIN;

-- Backfill sanity -----------------------------------------------------------

DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM public.tasks WHERE task_type IS NULL) = 0,
           'Backfill: expected zero rows with NULL task_type';
END $$;

-- Fixtures (creator user only; no project_members rows needed) --------------

WITH u AS (
    INSERT INTO auth.users (id, email) VALUES
      ('99999999-9999-9999-9999-999999999999', 'tasktype-smoke@example.test')
    ON CONFLICT (id) DO NOTHING
    RETURNING id
) SELECT 1;

-- Branch 2: INSERT project root ---------------------------------------------

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin)
VALUES
  ('fefefefe-0000-0000-0000-000000000000', NULL,
   'fefefefe-0000-0000-0000-000000000000',
   '99999999-9999-9999-9999-999999999999',
   'task_type smoke — project root', 'instance');

DO $$
BEGIN
    ASSERT (SELECT task_type = 'project'
              FROM public.tasks
             WHERE id = 'fefefefe-0000-0000-0000-000000000000'),
           'Branch 2 (project root): expected task_type = project';
END $$;

-- Branch 3: INSERT child of project → phase ---------------------------------

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin)
VALUES
  ('fefefefe-0001-0000-0000-000000000000',
   'fefefefe-0000-0000-0000-000000000000',
   'fefefefe-0000-0000-0000-000000000000',
   '99999999-9999-9999-9999-999999999999',
   'Phase A', 'instance');

DO $$
BEGIN
    ASSERT (SELECT task_type = 'phase'
              FROM public.tasks
             WHERE id = 'fefefefe-0001-0000-0000-000000000000'),
           'Branch 3 (child of project): expected task_type = phase';
END $$;

-- Branch 4: INSERT grandchild → milestone -----------------------------------

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin)
VALUES
  ('fefefefe-0002-0000-0000-000000000000',
   'fefefefe-0001-0000-0000-000000000000',
   'fefefefe-0000-0000-0000-000000000000',
   '99999999-9999-9999-9999-999999999999',
   'Milestone A.1', 'instance');

DO $$
BEGIN
    ASSERT (SELECT task_type = 'milestone'
              FROM public.tasks
             WHERE id = 'fefefefe-0002-0000-0000-000000000000'),
           'Branch 4 (grandchild): expected task_type = milestone';
END $$;

-- Branch 5: INSERT great-grandchild → task ----------------------------------

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin)
VALUES
  ('fefefefe-0003-0000-0000-000000000000',
   'fefefefe-0002-0000-0000-000000000000',
   'fefefefe-0000-0000-0000-000000000000',
   '99999999-9999-9999-9999-999999999999',
   'Task A.1.1', 'instance');

DO $$
BEGIN
    ASSERT (SELECT task_type = 'task'
              FROM public.tasks
             WHERE id = 'fefefefe-0003-0000-0000-000000000000'),
           'Branch 5 (great-grandchild): expected task_type = task';
END $$;

-- Branch 6: reparent a milestone under a different phase --------------------

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin)
VALUES
  ('fefefefe-0004-0000-0000-000000000000',
   'fefefefe-0000-0000-0000-000000000000',
   'fefefefe-0000-0000-0000-000000000000',
   '99999999-9999-9999-9999-999999999999',
   'Phase B', 'instance');

UPDATE public.tasks
   SET parent_task_id = 'fefefefe-0004-0000-0000-000000000000'
 WHERE id = 'fefefefe-0002-0000-0000-000000000000';

DO $$
BEGIN
    ASSERT (SELECT task_type = 'milestone'
              FROM public.tasks
             WHERE id = 'fefefefe-0002-0000-0000-000000000000'),
           'Branch 6 (reparent milestone → different phase): expected task_type to stay milestone';
END $$;

-- Branch 7: nest a previously-phase task under another phase ----------------
-- A depth-1 row (phase) whose parent is changed to a depth-1 sibling becomes
-- depth-2 (milestone). The trigger must recompute, NOT stick with 'phase'.

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin)
VALUES
  ('fefefefe-0005-0000-0000-000000000000',
   'fefefefe-0000-0000-0000-000000000000',
   'fefefefe-0000-0000-0000-000000000000',
   '99999999-9999-9999-9999-999999999999',
   'Phase C (to be nested)', 'instance');

DO $$
BEGIN
    ASSERT (SELECT task_type = 'phase'
              FROM public.tasks
             WHERE id = 'fefefefe-0005-0000-0000-000000000000'),
           'Branch 7 setup: Phase C should start as phase';
END $$;

UPDATE public.tasks
   SET parent_task_id = 'fefefefe-0004-0000-0000-000000000000'
 WHERE id = 'fefefefe-0005-0000-0000-000000000000';

DO $$
BEGIN
    ASSERT (SELECT task_type = 'milestone'
              FROM public.tasks
             WHERE id = 'fefefefe-0005-0000-0000-000000000000'),
           'Branch 7 (re-nest phase under phase): expected task_type = milestone';
END $$;

ROLLBACK;
