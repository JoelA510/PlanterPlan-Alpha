-- EXPECT: every persona-row pair returns the documented oracle
-- Manual smoke test for: docs/db/migrations/2026_04_18_task_comments.sql
-- Invocation (against a disposable local Supabase):
--   psql "$SUPABASE_DB_URL" -f docs/db/tests/task_comments_rls.sql
--
-- Covers:
--   1. set_task_comments_root_id correctness (phase row vs. leaf task).
--   2. SELECT policy across owner / editor / viewer / non-member / admin.
--   3. INSERT policy: author pinned via WITH CHECK; non-members blocked.
--   4. UPDATE policy: only the author on undeleted rows; immutable fields
--      (task_id / root_id / parent_comment_id / author_id) enforced via
--      WITH CHECK.
--   5. DELETE policy: author, project owner, admin. Non-owner non-author
--      blocked.
--   6. Soft-delete vs. hard-delete branches: UPDATE ... SET deleted_at is
--      allowed by the update policy (author); DELETE is only allowed by
--      the three roles above.

BEGIN;

-- Fixtures -------------------------------------------------------------------

INSERT INTO auth.users (id, email) VALUES
  ('10000000-0000-0000-0000-000000000001', 'owner@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'editor@example.test'),
  ('10000000-0000-0000-0000-000000000003', 'viewer@example.test'),
  ('10000000-0000-0000-0000-000000000004', 'nonmember@example.test'),
  ('10000000-0000-0000-0000-000000000005', 'admin@example.test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_users (user_id, email) VALUES
  ('10000000-0000-0000-0000-000000000005', 'admin@example.test')
ON CONFLICT (user_id) DO NOTHING;

-- Project (root task) + phase (depth-1) + leaf task (depth-2) ---------------

INSERT INTO public.tasks (id, parent_task_id, root_id, creator, title, origin)
VALUES
  ('20000000-0000-0000-0000-000000000000', NULL,
   '20000000-0000-0000-0000-000000000000',
   '10000000-0000-0000-0000-000000000001',
   'RLS smoke project', 'instance');

INSERT INTO public.tasks (id, parent_task_id, creator, title, origin)
VALUES
  ('20000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000000',
   '10000000-0000-0000-0000-000000000001',
   'Phase A', 'instance');

INSERT INTO public.tasks (id, parent_task_id, creator, title, origin)
VALUES
  ('20000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   'Leaf task A.1', 'instance');

INSERT INTO public.project_members (project_id, user_id, role) VALUES
  ('20000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'owner'),
  ('20000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'editor'),
  ('20000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'viewer');

-- Helpers to switch personas -------------------------------------------------

CREATE OR REPLACE FUNCTION pg_temp.act_as(p_user_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('role', 'authenticated', true);
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.reset_actor() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', '', true);
  PERFORM set_config('role', '', true);
END;
$$;

-- Branch 1: set_task_comments_root_id on a leaf task -------------------------
-- Author (owner) inserts a comment on the leaf; root_id must auto-fill to the
-- project id even though the INSERT does not supply it.

SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000001');

INSERT INTO public.task_comments (id, task_id, author_id, body)
VALUES
  ('30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   'Comment on leaf task');

DO $$
BEGIN
    ASSERT (SELECT root_id = '20000000-0000-0000-0000-000000000000'
              FROM public.task_comments
             WHERE id = '30000000-0000-0000-0000-000000000001'),
           'Branch 1 (root_id auto-fill on leaf): expected root_id = project id';
END $$;

-- Branch 2: set_task_comments_root_id on a phase row (depth-1) ---------------
-- Phase tasks have root_id set (by trg_set_root_id_from_parent on insert), so
-- comments posted directly to a phase should fill root_id from that root.

INSERT INTO public.task_comments (id, task_id, author_id, body)
VALUES
  ('30000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   'Comment on phase row');

DO $$
BEGIN
    ASSERT (SELECT root_id = '20000000-0000-0000-0000-000000000000'
              FROM public.task_comments
             WHERE id = '30000000-0000-0000-0000-000000000002'),
           'Branch 2 (root_id auto-fill on phase): expected root_id = project id';
END $$;

-- Branch 3: SELECT — owner sees both comments ---------------------------------

DO $$
BEGIN
    ASSERT (SELECT count(*) = 2
              FROM public.task_comments
             WHERE root_id = '20000000-0000-0000-0000-000000000000'),
           'Branch 3 (SELECT owner): expected 2 rows visible';
END $$;

-- Branch 4: SELECT — editor sees both ----------------------------------------

SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000002');

DO $$
BEGIN
    ASSERT (SELECT count(*) = 2
              FROM public.task_comments
             WHERE root_id = '20000000-0000-0000-0000-000000000000'),
           'Branch 4 (SELECT editor): expected 2 rows visible';
END $$;

-- Branch 5: SELECT — viewer sees both ----------------------------------------

SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000003');

DO $$
BEGIN
    ASSERT (SELECT count(*) = 2
              FROM public.task_comments
             WHERE root_id = '20000000-0000-0000-0000-000000000000'),
           'Branch 5 (SELECT viewer): expected 2 rows visible';
END $$;

-- Branch 6: SELECT — non-member sees zero rows -------------------------------

SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000004');

DO $$
BEGIN
    ASSERT (SELECT count(*) = 0
              FROM public.task_comments
             WHERE root_id = '20000000-0000-0000-0000-000000000000'),
           'Branch 6 (SELECT non-member): expected 0 rows visible';
END $$;

-- Branch 7: SELECT — admin sees both -----------------------------------------

SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000005');

DO $$
BEGIN
    ASSERT (SELECT count(*) = 2
              FROM public.task_comments
             WHERE root_id = '20000000-0000-0000-0000-000000000000'),
           'Branch 7 (SELECT admin): expected 2 rows visible';
END $$;

-- Branch 8: INSERT — viewer can post a comment -------------------------------

SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000003');

INSERT INTO public.task_comments (id, task_id, author_id, body)
VALUES
  ('30000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000003',
   'Viewer comment');

DO $$
BEGIN
    ASSERT EXISTS (SELECT 1 FROM public.task_comments
                    WHERE id = '30000000-0000-0000-0000-000000000003'),
           'Branch 8 (INSERT viewer): expected viewer can post';
END $$;

-- Branch 9: INSERT — non-member blocked by USING / WITH CHECK ---------------

SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000004');

DO $$
BEGIN
    BEGIN
        INSERT INTO public.task_comments (id, task_id, author_id, body)
        VALUES
          ('30000000-0000-0000-0000-000000000009',
           '20000000-0000-0000-0000-000000000002',
           '10000000-0000-0000-0000-000000000004',
           'Non-member should be blocked');
        RAISE EXCEPTION 'Branch 9 (INSERT non-member): expected RLS violation';
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        -- Expected path.
        NULL;
    END;
END $$;

-- Branch 10: INSERT — author_id mismatch (viewer posting as someone else) ----

SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000003');

DO $$
BEGIN
    BEGIN
        INSERT INTO public.task_comments (id, task_id, author_id, body)
        VALUES
          ('30000000-0000-0000-0000-00000000000a',
           '20000000-0000-0000-0000-000000000002',
           '10000000-0000-0000-0000-000000000002',  -- editor, not the caller
           'Spoofed author should be blocked');
        RAISE EXCEPTION 'Branch 10 (INSERT author spoof): expected RLS violation';
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        NULL;
    END;
END $$;

-- Branch 11: UPDATE — author edits own body ----------------------------------
-- Viewer edits their own comment (Branch 8 row).

UPDATE public.task_comments
   SET body = 'Viewer comment (edited)'
 WHERE id = '30000000-0000-0000-0000-000000000003';

DO $$
BEGIN
    ASSERT (SELECT body = 'Viewer comment (edited)'
              FROM public.task_comments
             WHERE id = '30000000-0000-0000-0000-000000000003'),
           'Branch 11 (UPDATE author): expected body update to succeed';
END $$;

-- Branch 12: UPDATE — non-author blocked -------------------------------------
-- Editor tries to edit viewer's comment.

SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000002');

DO $$
DECLARE v_row_count int;
BEGIN
    UPDATE public.task_comments
       SET body = 'Editor should not be able to edit this'
     WHERE id = '30000000-0000-0000-0000-000000000003';
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    ASSERT v_row_count = 0,
           'Branch 12 (UPDATE non-author): expected 0 rows updated';
END $$;

-- Branch 13: UPDATE — immutable field (task_id) blocked via WITH CHECK -------

SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000003');

DO $$
BEGIN
    BEGIN
        UPDATE public.task_comments
           SET task_id = '20000000-0000-0000-0000-000000000001' -- try to move to phase row
         WHERE id = '30000000-0000-0000-0000-000000000003';
        RAISE EXCEPTION 'Branch 13 (UPDATE immutable task_id): expected WITH CHECK violation';
    EXCEPTION WHEN check_violation OR insufficient_privilege THEN
        NULL;
    END;
END $$;

-- Branch 14: Soft-delete — author writes deleted_at + blanks body ------------
-- Semantically the "delete UX"; policy-wise it's an UPDATE by the author.

UPDATE public.task_comments
   SET deleted_at = now(), body = ''
 WHERE id = '30000000-0000-0000-0000-000000000003';

DO $$
BEGIN
    ASSERT (SELECT deleted_at IS NOT NULL AND body = ''
              FROM public.task_comments
             WHERE id = '30000000-0000-0000-0000-000000000003'),
           'Branch 14 (soft-delete): expected deleted_at set and body cleared';
END $$;

-- Branch 15: UPDATE on a soft-deleted row is blocked (deleted_at IS NULL gate)

DO $$
DECLARE v_row_count int;
BEGIN
    UPDATE public.task_comments
       SET body = 'resurrect me'
     WHERE id = '30000000-0000-0000-0000-000000000003';
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    ASSERT v_row_count = 0,
           'Branch 15 (UPDATE on soft-deleted): expected 0 rows updated';
END $$;

-- Branch 16: DELETE — non-author, non-owner blocked --------------------------
-- Editor tries to hard-delete viewer's comment.

SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000002');

DO $$
DECLARE v_row_count int;
BEGIN
    DELETE FROM public.task_comments
     WHERE id = '30000000-0000-0000-0000-000000000003';
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    ASSERT v_row_count = 0,
           'Branch 16 (DELETE editor of viewer comment): expected 0 rows deleted';
END $$;

-- Branch 17: DELETE — project owner can hard-delete anyone's comment ---------

SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000001');

DELETE FROM public.task_comments
 WHERE id = '30000000-0000-0000-0000-000000000003';

DO $$
BEGIN
    ASSERT NOT EXISTS (SELECT 1 FROM public.task_comments
                        WHERE id = '30000000-0000-0000-0000-000000000003'),
           'Branch 17 (DELETE owner): expected row gone';
END $$;

-- Branch 18: DELETE — admin can hard-delete any comment ----------------------

SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000005');

DELETE FROM public.task_comments
 WHERE id = '30000000-0000-0000-0000-000000000001';

DO $$
BEGIN
    ASSERT NOT EXISTS (SELECT 1 FROM public.task_comments
                        WHERE id = '30000000-0000-0000-0000-000000000001'),
           'Branch 18 (DELETE admin): expected row gone';
END $$;

SELECT pg_temp.reset_actor();

ROLLBACK;
