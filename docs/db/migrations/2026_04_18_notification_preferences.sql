-- Migration: Wave 30 — notification preferences + log
-- Date: 2026-04-18
-- Description:
--   Two tables that every notification feature reads from. Bootstrap trigger
--   creates a default prefs row for every existing and future auth.users row.
--   Append-only notification_log audit trail used for debugging, idempotency,
--   and user-visible "recent notifications" tab.
--
-- Revert path:
--   DROP TRIGGER IF EXISTS trg_bootstrap_notification_prefs ON auth.users;
--   DROP FUNCTION IF EXISTS public.bootstrap_notification_prefs();
--   DROP TABLE IF EXISTS public.notification_log CASCADE;
--   DROP TABLE IF EXISTS public.notification_preferences CASCADE;

CREATE TABLE public.notification_preferences (
  user_id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_mentions       boolean     NOT NULL DEFAULT true,
  email_overdue_digest text        NOT NULL DEFAULT 'daily' CHECK (email_overdue_digest IN ('off','daily','weekly')),
  email_assignment     boolean     NOT NULL DEFAULT true,
  push_mentions        boolean     NOT NULL DEFAULT true,
  push_overdue         boolean     NOT NULL DEFAULT true,
  push_assignment      boolean     NOT NULL DEFAULT false,
  quiet_hours_start    time,
  quiet_hours_end      time,
  timezone             text        NOT NULL DEFAULT 'UTC',
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notification_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel     text        NOT NULL CHECK (channel IN ('email','push')),
  event_type  text        NOT NULL,
  payload     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  provider_id text,
  error       text
);

CREATE INDEX idx_notification_log_user_id_sent_at ON public.notification_log (user_id, sent_at DESC);
CREATE INDEX idx_notification_log_event_type      ON public.notification_log (event_type, sent_at DESC);

CREATE TRIGGER trg_notification_preferences_handle_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log         ENABLE ROW LEVEL SECURITY;

-- RLS: notification_preferences
CREATE POLICY "Notif prefs: select own"  ON public.notification_preferences FOR SELECT  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Notif prefs: insert own"  ON public.notification_preferences FOR INSERT  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Notif prefs: update own"  ON public.notification_preferences FOR UPDATE  TO authenticated USING (user_id = auth.uid());
-- DELETE not exposed; UPDATE is the off-switch.

-- RLS: notification_log (SELECT-only for users, plus admin)
CREATE POLICY "Notif log: select own or admin"
ON public.notification_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
-- INSERT/UPDATE/DELETE denied at policy level — only SECURITY DEFINER dispatch functions write.

-- Bootstrap: create a prefs row for every auth.users INSERT
CREATE OR REPLACE FUNCTION public.bootstrap_notification_prefs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_notification_prefs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_notification_prefs() TO authenticated;

CREATE TRIGGER trg_bootstrap_notification_prefs
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.bootstrap_notification_prefs();

-- Backfill prefs for existing users
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
