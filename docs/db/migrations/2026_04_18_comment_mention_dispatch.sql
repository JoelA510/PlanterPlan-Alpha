-- Migration: Wave 30 — comment mention dispatch
-- Date: 2026-04-18
-- Description:
--   Two additions stacked on top of the Wave 30 Task 1 notification tables.
--
--   1. `public.resolve_user_handles(p_handles text[])` — SECURITY DEFINER
--      STABLE RPC that maps each handle to an auth.users id (email-prefix
--      match OR raw_user_meta_data->>'username'). Called by the client-side
--      CommentComposer between `extractMentions` and the create mutation
--      (src/features/tasks/lib/comment-mentions.ts → `resolveMentions`).
--      Unmatched handles are returned with `user_id = NULL`; the caller
--      filters them out before persisting to `task_comments.mentions`.
--
--   2. `public.enqueue_comment_mentions()` — AFTER INSERT trigger on
--      `public.task_comments` that writes one `mention_pending` row into
--      `notification_log` per resolved uuid in `NEW.mentions` (skipping the
--      comment author — no self-notifications). The dispatch edge function
--      `supabase/functions/dispatch-notifications/` picks these up on its
--      cron tick (operator-scheduled; see
--      `docs/operations/edge-function-schedules.md`) and fans out to email
--      + push per each recipient's `notification_preferences`.
--
--   Both additions are SECURITY DEFINER because:
--     - `resolve_user_handles` reads `auth.users` (restricted to the
--       postgres role); the definer context lets authenticated callers
--       look up handles without exposing the table directly.
--     - `enqueue_comment_mentions` writes to `notification_log`, whose RLS
--       denies INSERT to all client roles — only SECURITY DEFINER code may
--       populate it.
--
-- Revert path:
--   DROP TRIGGER IF EXISTS trg_enqueue_comment_mentions ON public.task_comments;
--   DROP FUNCTION IF EXISTS public.enqueue_comment_mentions();
--   DROP FUNCTION IF EXISTS public.resolve_user_handles(text[]);

-- ---------------------------------------------------------------------------
-- RPC: resolve_user_handles
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resolve_user_handles(p_handles text[])
RETURNS TABLE(handle text, user_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  SELECT h, u.id
  FROM unnest(p_handles) AS h
  LEFT JOIN auth.users u
    ON lower(u.email) LIKE lower(h) || '@%'
    OR lower(u.raw_user_meta_data ->> 'username') = lower(h);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_user_handles(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_user_handles(text[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: enqueue_comment_mentions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enqueue_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- No-op when there are no mentions. `array_length(x, 1)` is NULL for an
  -- empty array — guard on both to avoid a FOREACH NULL runtime error.
  IF NEW.mentions IS NULL OR array_length(NEW.mentions, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_user_id IN
    SELECT DISTINCT t::uuid
    FROM unnest(NEW.mentions) AS t
    WHERE t IS NOT NULL
      AND t ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      AND t::uuid <> NEW.author_id
  LOOP
    INSERT INTO public.notification_log (user_id, channel, event_type, payload)
    VALUES (
      v_user_id,
      'email',  -- placeholder channel; dispatcher branches on prefs per recipient.
      'mention_pending',
      jsonb_build_object(
        'comment_id', NEW.id,
        'task_id', NEW.task_id,
        'author_id', NEW.author_id,
        'body_preview', substring(NEW.body, 1, 140)
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_comment_mentions() FROM PUBLIC;
-- Only the trigger invokes this; no GRANT EXECUTE to role-based callers.

CREATE TRIGGER trg_enqueue_comment_mentions
AFTER INSERT ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_comment_mentions();
