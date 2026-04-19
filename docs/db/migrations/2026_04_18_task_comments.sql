-- Migration: Wave 26 — task_comments table
-- Date: 2026-04-18
-- Description:
--   First column of the §3.3 Collaboration Suite. Adds a threaded comments table
--   scoped to project membership via tasks.root_id, with soft-delete semantics so
--   the Wave 27 activity log can report deletion events without losing the row.
--
--   Threading is unbounded at the DB layer (`parent_comment_id` is a self-FK with
--   no depth check) — the UI in Wave 26 Task 2 enforces a 1-level visual cap with
--   reply-to-reply chain-lift. This split keeps the data faithful while keeping
--   the UI predictable.
--
-- Revert path:
--   ALTER PUBLICATION supabase_realtime DROP TABLE public.task_comments;
--   DROP TABLE IF EXISTS public.task_comments CASCADE;
--   DROP FUNCTION IF EXISTS public.set_task_comments_root_id();

CREATE TABLE public.task_comments (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           uuid          NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  root_id           uuid          NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  parent_comment_id uuid          REFERENCES public.task_comments(id) ON DELETE CASCADE,
  author_id         uuid          NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  body              text          NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 10000),
  mentions          text[]        NOT NULL DEFAULT ARRAY[]::text[],
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  edited_at         timestamptz,
  deleted_at        timestamptz
);

CREATE INDEX idx_task_comments_task_id           ON public.task_comments (task_id, created_at DESC);
CREATE INDEX idx_task_comments_root_id           ON public.task_comments (root_id, created_at DESC);
CREATE INDEX idx_task_comments_parent_comment_id ON public.task_comments (parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- root_id auto-fill (mirrors the set_root_id_from_parent pattern on public.tasks)
CREATE OR REPLACE FUNCTION public.set_task_comments_root_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_root uuid;
BEGIN
  SELECT COALESCE(t.root_id, t.id) INTO v_root
  FROM public.tasks t
  WHERE t.id = NEW.task_id;
  IF v_root IS NULL THEN
    RAISE EXCEPTION 'task_comments: parent task % not found', NEW.task_id;
  END IF;
  NEW.root_id := v_root;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_task_comments_root_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_task_comments_root_id() TO authenticated;

CREATE TRIGGER trg_task_comments_set_root_id
BEFORE INSERT ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_task_comments_root_id();

CREATE TRIGGER trg_task_comments_handle_updated_at
BEFORE UPDATE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Realtime publication add (required for Task 3's channel subscription)
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: any project member, plus admin
CREATE POLICY "Comments select by project members"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  is_active_member(root_id, auth.uid())
  OR public.is_admin(auth.uid())
);

-- INSERT: any project member; author must be self
CREATE POLICY "Comments insert by project members"
ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    is_active_member(root_id, auth.uid())
    OR public.is_admin(auth.uid())
  )
);

-- UPDATE: author edits own undeleted comments only; immutable fields enforced via WITH CHECK
CREATE POLICY "Comments update by author"
ON public.task_comments
FOR UPDATE
TO authenticated
USING (
  (author_id = auth.uid() AND deleted_at IS NULL)
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  task_id           = (SELECT task_id           FROM public.task_comments WHERE id = task_comments.id)
  AND root_id       = (SELECT root_id           FROM public.task_comments WHERE id = task_comments.id)
  AND parent_comment_id IS NOT DISTINCT FROM (SELECT parent_comment_id FROM public.task_comments WHERE id = task_comments.id)
  AND author_id     = (SELECT author_id         FROM public.task_comments WHERE id = task_comments.id)
);

-- DELETE: author, project owner, or admin (soft-delete preferred via UPDATE)
CREATE POLICY "Comments delete by author or owner"
ON public.task_comments
FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  OR public.check_project_ownership_by_role(root_id, auth.uid())
  OR public.is_admin(auth.uid())
);
