-- Migration: Wave 27 — activity_log + write triggers
-- Date: 2026-04-18
-- Description:
--   Append-only audit trail for project-scoped writes. Three trigger functions
--   (one each for tasks, task_comments, project_members) AFTER-fire on every
--   write and INSERT a row keyed to the affected project_id. RLS grants SELECT
--   to project members + admin; INSERT/UPDATE/DELETE are denied — only the
--   trigger functions (SECURITY DEFINER) write rows.
--
--   Payload sizes are kept small: a comment's body_preview is `substring(body, 1, 140)`
--   not the full body. Task UPDATE payloads list changed-keys only, not the full row.
--
--   The comment-change trigger orders soft-delete detection BEFORE body-change
--   detection, since Wave 26's softDelete writes both `deleted_at = now()` AND
--   `body = ''` in the same UPDATE. Without the ordering, a soft-delete would
--   emit `comment_edited` instead of `comment_deleted`.
--
-- Revert path:
--   DROP TRIGGER IF EXISTS trg_log_member_change ON public.project_members;
--   DROP TRIGGER IF EXISTS trg_log_comment_change ON public.task_comments;
--   DROP TRIGGER IF EXISTS trg_log_task_change ON public.tasks;
--   DROP FUNCTION IF EXISTS public.log_member_change();
--   DROP FUNCTION IF EXISTS public.log_comment_change();
--   DROP FUNCTION IF EXISTS public.log_task_change();
--   DROP TABLE IF EXISTS public.activity_log CASCADE;

CREATE TABLE public.activity_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text        NOT NULL CHECK (entity_type IN ('task','comment','member','project')),
  entity_id   uuid        NOT NULL,
  action      text        NOT NULL CHECK (action IN (
    'created','updated','deleted','status_changed',
    'member_added','member_removed','member_role_changed',
    'comment_posted','comment_edited','comment_deleted'
  )),
  payload     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_project_id ON public.activity_log (project_id, created_at DESC);
CREATE INDEX idx_activity_log_entity     ON public.activity_log (entity_type, entity_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- SELECT: project members + admin
CREATE POLICY "Activity log select by project members"
ON public.activity_log
FOR SELECT
TO authenticated
USING (
  is_active_member(project_id, auth.uid())
  OR public.is_admin(auth.uid())
);

-- INSERT/UPDATE/DELETE: explicit no policy → deny by default. The trigger functions
-- below write rows via SECURITY DEFINER and bypass RLS; admin can hard-delete via
-- a future maintenance path, not this wave.

----------------------------------------------------------------
-- Trigger function: log_task_change
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_task_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_project_id uuid;
  v_action     text;
  v_payload    jsonb := '{}'::jsonb;
  v_changed    text[];
BEGIN
  v_project_id := COALESCE(NEW.root_id, OLD.root_id, NEW.id, OLD.id);

  IF TG_OP = 'INSERT' THEN
    v_action  := 'created';
    v_payload := jsonb_build_object(
      'title', NEW.title,
      'parent_task_id', NEW.parent_task_id,
      'status', NEW.status
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_action  := 'status_changed';
      v_payload := jsonb_build_object('from', OLD.status, 'to', NEW.status);
    ELSE
      v_action := 'updated';
      v_changed := ARRAY[]::text[];
      IF NEW.title       IS DISTINCT FROM OLD.title       THEN v_changed := array_append(v_changed, 'title'); END IF;
      IF NEW.description IS DISTINCT FROM OLD.description THEN v_changed := array_append(v_changed, 'description'); END IF;
      IF NEW.start_date  IS DISTINCT FROM OLD.start_date  THEN v_changed := array_append(v_changed, 'start_date'); END IF;
      IF NEW.due_date    IS DISTINCT FROM OLD.due_date    THEN v_changed := array_append(v_changed, 'due_date'); END IF;
      IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN v_changed := array_append(v_changed, 'assignee_id'); END IF;
      IF array_length(v_changed, 1) IS NULL THEN
        RETURN COALESCE(NEW, OLD); -- no audit-worthy change
      END IF;
      v_payload := jsonb_build_object('changed_keys', v_changed);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action  := 'deleted';
    v_payload := jsonb_build_object('title', OLD.title);
  END IF;

  INSERT INTO public.activity_log (project_id, actor_id, entity_type, entity_id, action, payload)
  VALUES (v_project_id, auth.uid(), 'task', COALESCE(NEW.id, OLD.id), v_action, v_payload);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_task_change
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.log_task_change();

----------------------------------------------------------------
-- Trigger function: log_comment_change
-- ORDER MATTERS: soft-delete detection first, then body change.
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_comment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_action  text;
  v_payload jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action  := 'comment_posted';
    v_payload := jsonb_build_object('task_id', NEW.task_id, 'body_preview', substring(NEW.body, 1, 140));
  ELSIF TG_OP = 'UPDATE' THEN
    -- soft-delete first (deleted_at flipping null -> non-null)
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_action  := 'comment_deleted';
      v_payload := jsonb_build_object('task_id', NEW.task_id);
    ELSIF NEW.body IS DISTINCT FROM OLD.body THEN
      v_action  := 'comment_edited';
      v_payload := jsonb_build_object('task_id', NEW.task_id, 'body_preview', substring(NEW.body, 1, 140));
    ELSE
      RETURN NEW; -- no audit-worthy change
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action  := 'comment_deleted';
    v_payload := jsonb_build_object('task_id', OLD.task_id);
  END IF;

  INSERT INTO public.activity_log (project_id, actor_id, entity_type, entity_id, action, payload)
  VALUES (COALESCE(NEW.root_id, OLD.root_id), auth.uid(), 'comment', COALESCE(NEW.id, OLD.id), v_action, v_payload);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_comment_change
AFTER INSERT OR UPDATE OR DELETE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.log_comment_change();

----------------------------------------------------------------
-- Trigger function: log_member_change
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_member_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_action  text;
  v_payload jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action  := 'member_added';
    v_payload := jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role);
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    v_action  := 'member_role_changed';
    v_payload := jsonb_build_object('user_id', NEW.user_id, 'from', OLD.role, 'to', NEW.role);
  ELSIF TG_OP = 'DELETE' THEN
    v_action  := 'member_removed';
    v_payload := jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role);
  ELSE
    RETURN COALESCE(NEW, OLD); -- no audit-worthy change
  END IF;

  INSERT INTO public.activity_log (project_id, actor_id, entity_type, entity_id, action, payload)
  VALUES (COALESCE(NEW.project_id, OLD.project_id), auth.uid(), 'member', COALESCE(NEW.id, OLD.id), v_action, v_payload);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_member_change
AFTER INSERT OR UPDATE OR DELETE ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION public.log_member_change();

REVOKE ALL ON FUNCTION public.log_task_change()    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_comment_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_member_change()  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_task_change()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_comment_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_member_change()  TO authenticated;
