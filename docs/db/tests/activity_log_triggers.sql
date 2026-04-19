-- EXPECT: nine actions × correct payload + soft-delete ordering correct
-- Manual smoke test for: docs/db/migrations/2026_04_18_activity_log.sql
-- Invocation (against a disposable local Supabase):
--   psql "$SUPABASE_DB_URL" -f docs/db/tests/activity_log_triggers.sql
--
-- Covers the nine action types emitted by the three trigger functions:
--   tasks:  'created', 'updated', 'deleted', 'status_changed'
--   comments: 'comment_posted', 'comment_edited', 'comment_deleted'
--   members: 'member_added', 'member_role_changed', 'member_removed'
--
-- Critical branch: soft-delete a comment (UPDATE sets BOTH deleted_at AND
-- body='') → exactly one 'comment_deleted' row, NOT a 'comment_edited' row.
-- If the trigger ordering were reversed, the soft-delete would fire
-- 'comment_edited' because body changed.

BEGIN;

-- Fixtures -------------------------------------------------------------------

INSERT INTO auth.users (id, email) VALUES
  ('40000000-0000-0000-0000-000000000001', 'actor@example.test')
ON CONFLICT (id) DO NOTHING;

-- Impersonate the actor for auth.uid() inside trigger functions.
SELECT set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

-- Seed a project + one phase + one leaf task owned by the actor.
INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin)
VALUES
  ('50000000-0000-0000-0000-000000000000', NULL,
   '50000000-0000-0000-0000-000000000000',
   '40000000-0000-0000-0000-000000000001',
   'Activity smoke project', 'instance');

INSERT INTO public.tasks (id, parent_task_id, creator, title, origin, status)
VALUES
  ('50000000-0000-0000-0000-000000000010',
   '50000000-0000-0000-0000-000000000000',
   '40000000-0000-0000-0000-000000000001',
   'Phase A', 'instance', 'todo');

-- Branch 1: task created ------------------------------------------------------

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM public.activity_log
            WHERE entity_id = '50000000-0000-0000-0000-000000000010' AND action = 'created'),
         'Branch 1 (task created): expected exactly one row';
  ASSERT (SELECT payload->>'title' = 'Phase A' FROM public.activity_log
            WHERE entity_id = '50000000-0000-0000-0000-000000000010' AND action = 'created'),
         'Branch 1 (task created): payload.title mismatch';
END $$;

-- Branch 2: task status_changed -----------------------------------------------

UPDATE public.tasks
   SET status = 'in_progress'
 WHERE id = '50000000-0000-0000-0000-000000000010';

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM public.activity_log
            WHERE entity_id = '50000000-0000-0000-0000-000000000010' AND action = 'status_changed'),
         'Branch 2 (task status_changed): expected exactly one row';
  ASSERT (SELECT payload->>'from' = 'todo' AND payload->>'to' = 'in_progress'
            FROM public.activity_log
           WHERE entity_id = '50000000-0000-0000-0000-000000000010' AND action = 'status_changed'),
         'Branch 2 (task status_changed): payload.from/to mismatch';
END $$;

-- Branch 3: task updated (title change, no status change) ---------------------

UPDATE public.tasks
   SET title = 'Phase A (renamed)'
 WHERE id = '50000000-0000-0000-0000-000000000010';

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM public.activity_log
            WHERE entity_id = '50000000-0000-0000-0000-000000000010' AND action = 'updated'),
         'Branch 3 (task updated): expected exactly one row';
  ASSERT (SELECT (payload->'changed_keys' ? 'title')
            FROM public.activity_log
           WHERE entity_id = '50000000-0000-0000-0000-000000000010' AND action = 'updated'),
         'Branch 3 (task updated): expected changed_keys to include "title"';
END $$;

-- Branch 4: member_added ------------------------------------------------------

INSERT INTO public.project_members (project_id, user_id, role) VALUES
  ('50000000-0000-0000-0000-000000000000',
   '40000000-0000-0000-0000-000000000001',
   'owner');

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM public.activity_log WHERE action = 'member_added'),
         'Branch 4 (member_added): expected exactly one row';
END $$;

-- Branch 5: member_role_changed -----------------------------------------------

UPDATE public.project_members
   SET role = 'editor'
 WHERE project_id = '50000000-0000-0000-0000-000000000000'
   AND user_id    = '40000000-0000-0000-0000-000000000001';

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM public.activity_log WHERE action = 'member_role_changed'),
         'Branch 5 (member_role_changed): expected exactly one row';
  ASSERT (SELECT payload->>'from' = 'owner' AND payload->>'to' = 'editor'
            FROM public.activity_log WHERE action = 'member_role_changed'),
         'Branch 5 (member_role_changed): payload.from/to mismatch';
END $$;

-- Branch 6: comment_posted ----------------------------------------------------

INSERT INTO public.task_comments (id, task_id, author_id, body)
VALUES
  ('60000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000010',
   '40000000-0000-0000-0000-000000000001',
   'First comment');

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM public.activity_log
            WHERE entity_id = '60000000-0000-0000-0000-000000000001' AND action = 'comment_posted'),
         'Branch 6 (comment_posted): expected exactly one row';
  ASSERT (SELECT payload->>'body_preview' = 'First comment'
            FROM public.activity_log
           WHERE entity_id = '60000000-0000-0000-0000-000000000001' AND action = 'comment_posted'),
         'Branch 6 (comment_posted): body_preview mismatch';
END $$;

-- Branch 7: comment_edited (body change, deleted_at still NULL) ---------------

UPDATE public.task_comments
   SET body = 'First comment (edited)'
 WHERE id = '60000000-0000-0000-0000-000000000001';

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM public.activity_log
            WHERE entity_id = '60000000-0000-0000-0000-000000000001' AND action = 'comment_edited'),
         'Branch 7 (comment_edited): expected exactly one row';
END $$;

-- Branch 8: CRITICAL — soft-delete ordering ----------------------------------
-- The soft-delete path in Wave 26's planterClient writes both deleted_at AND
-- body = '' in a SINGLE UPDATE. The trigger must emit 'comment_deleted' and
-- NOT 'comment_edited'. If the branches were reordered, we'd get an edit row
-- here because `NEW.body IS DISTINCT FROM OLD.body` is also true.

UPDATE public.task_comments
   SET deleted_at = now(), body = ''
 WHERE id = '60000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  v_deleted_count int;
  v_edited_count  int;
BEGIN
  SELECT count(*) INTO v_deleted_count FROM public.activity_log
   WHERE entity_id = '60000000-0000-0000-0000-000000000001' AND action = 'comment_deleted';
  -- Note: we allow the prior edit from Branch 7 to remain in the log; we
  -- only assert that THIS update emitted exactly one new 'comment_deleted'.
  SELECT count(*) INTO v_edited_count FROM public.activity_log
   WHERE entity_id = '60000000-0000-0000-0000-000000000001' AND action = 'comment_edited';
  ASSERT v_deleted_count = 1,
         'Branch 8 (soft-delete): expected exactly one comment_deleted row';
  ASSERT v_edited_count = 1,
         'Branch 8 (soft-delete): prior edit count unchanged (should be 1, not 2); '
      || 'more than 1 implies the soft-delete mis-fired comment_edited';
END $$;

-- Branch 9: member_removed ----------------------------------------------------

DELETE FROM public.project_members
 WHERE project_id = '50000000-0000-0000-0000-000000000000'
   AND user_id    = '40000000-0000-0000-0000-000000000001';

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM public.activity_log WHERE action = 'member_removed'),
         'Branch 9 (member_removed): expected exactly one row';
END $$;

-- Branch 10: task deleted -----------------------------------------------------
-- Also exercises the ON DELETE CASCADE on task_comments — which in turn fires
-- trg_log_comment_change's DELETE path (another 'comment_deleted' row).

DELETE FROM public.tasks
 WHERE id = '50000000-0000-0000-0000-000000000010';

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM public.activity_log
            WHERE entity_id = '50000000-0000-0000-0000-000000000010' AND action = 'deleted'),
         'Branch 10 (task deleted): expected exactly one row';
END $$;

ROLLBACK;
