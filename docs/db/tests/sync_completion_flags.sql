-- Manual smoke test for: docs/db/migrations/2026_04_17_sync_task_completion.sql
-- Invocation:
--   psql "$SUPABASE_DB_URL" -f docs/db/tests/sync_completion_flags.sql
--
-- Covers every branch of `sync_task_completion_flags`:
--   1. INSERT with status = 'completed'              → is_complete := true
--   2. INSERT with status = 'todo', is_complete null → is_complete := false
--   3. UPDATE status → completed                     → is_complete auto-flipped true
--   4. UPDATE status → todo                          → is_complete auto-flipped false
--   5. UPDATE is_complete := true                    → status auto-flipped 'completed'
--   6. UPDATE is_complete := false                   → status auto-flipped 'todo'
--   7. UPDATE both sides at once                     → caller's values preserved

BEGIN;

WITH u AS (
    INSERT INTO auth.users (id, email) VALUES
      ('99999999-9999-9999-9999-999999999999', 'test-completion@example.test')
    ON CONFLICT (id) DO NOTHING RETURNING id
) SELECT 1;

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin, status)
VALUES
  ('dddddddd-0000-0000-0000-000000000000', NULL,
   'dddddddd-0000-0000-0000-000000000000',
   '99999999-9999-9999-9999-999999999999', 'Root for sync-flag tests', 'instance', 'todo');

-- Branch 1: INSERT status=completed → is_complete auto-true -----------------

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin, status)
VALUES
  ('dddddddd-0001-0000-0000-000000000000',
   'dddddddd-0000-0000-0000-000000000000',
   'dddddddd-0000-0000-0000-000000000000',
   '99999999-9999-9999-9999-999999999999',
   'Insert with completed', 'instance', 'completed');

DO $$
BEGIN
    ASSERT (SELECT is_complete = true
              FROM public.tasks
             WHERE id = 'dddddddd-0001-0000-0000-000000000000'),
           'Branch 1 (INSERT completed): expected is_complete = true';
END $$;

-- Branch 2: INSERT status=todo, is_complete unset → is_complete auto-false --

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin, status)
VALUES
  ('dddddddd-0002-0000-0000-000000000000',
   'dddddddd-0000-0000-0000-000000000000',
   'dddddddd-0000-0000-0000-000000000000',
   '99999999-9999-9999-9999-999999999999',
   'Insert with todo', 'instance', 'todo');

DO $$
BEGIN
    ASSERT (SELECT is_complete = false
              FROM public.tasks
             WHERE id = 'dddddddd-0002-0000-0000-000000000000'),
           'Branch 2 (INSERT todo): expected is_complete = false';
END $$;

-- Branch 3: UPDATE status → completed → is_complete auto-flipped ------------

UPDATE public.tasks
   SET status = 'completed'
 WHERE id = 'dddddddd-0002-0000-0000-000000000000';

DO $$
BEGIN
    ASSERT (SELECT is_complete = true
              FROM public.tasks
             WHERE id = 'dddddddd-0002-0000-0000-000000000000'),
           'Branch 3 (UPDATE status=completed): expected is_complete = true';
END $$;

-- Branch 4: UPDATE status → todo → is_complete auto-flipped false -----------

UPDATE public.tasks
   SET status = 'todo'
 WHERE id = 'dddddddd-0002-0000-0000-000000000000';

DO $$
BEGIN
    ASSERT (SELECT is_complete = false
              FROM public.tasks
             WHERE id = 'dddddddd-0002-0000-0000-000000000000'),
           'Branch 4 (UPDATE status=todo): expected is_complete = false';
END $$;

-- Branch 5: UPDATE is_complete := true → status auto-flipped 'completed' ----

UPDATE public.tasks
   SET is_complete = true
 WHERE id = 'dddddddd-0002-0000-0000-000000000000';

DO $$
BEGIN
    ASSERT (SELECT status = 'completed'
              FROM public.tasks
             WHERE id = 'dddddddd-0002-0000-0000-000000000000'),
           'Branch 5 (UPDATE is_complete=true): expected status = completed';
END $$;

-- Branch 6: UPDATE is_complete := false → status auto-flipped 'todo' --------

UPDATE public.tasks
   SET is_complete = false
 WHERE id = 'dddddddd-0002-0000-0000-000000000000';

DO $$
BEGIN
    ASSERT (SELECT status = 'todo'
              FROM public.tasks
             WHERE id = 'dddddddd-0002-0000-0000-000000000000'),
           'Branch 6 (UPDATE is_complete=false): expected status = todo';
END $$;

-- Branch 7: UPDATE both sides at once → both preserved verbatim -------------
-- Caller's intent wins: is_complete=true + status='blocked' is an unusual
-- pairing that indicates an explicit non-synced write (e.g. marking a block
-- on an already-checked task). The trigger must NOT overwrite either field.

UPDATE public.tasks
   SET is_complete = true,
       status = 'blocked'
 WHERE id = 'dddddddd-0002-0000-0000-000000000000';

DO $$
BEGIN
    ASSERT (SELECT is_complete = true AND status = 'blocked'
              FROM public.tasks
             WHERE id = 'dddddddd-0002-0000-0000-000000000000'),
           'Branch 7 (UPDATE both sides): expected caller values preserved';
END $$;

ROLLBACK;
