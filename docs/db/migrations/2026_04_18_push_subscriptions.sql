-- Migration: Wave 30 — push subscriptions
-- Date: 2026-04-18
-- Description:
--   One row per (user, browser-endpoint). RLS scopes to own; the dispatch
--   function (SECURITY DEFINER) reads across users and DELETEs stale rows
--   on 410 Gone responses.
--
-- Revert path:
--   DROP TABLE IF EXISTS public.push_subscriptions CASCADE;

CREATE TABLE public.push_subscriptions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      text        NOT NULL,
  p256dh        text        NOT NULL,
  auth          text        NOT NULL,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Push subs: select own"  ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Push subs: insert own"  ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Push subs: delete own"  ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());
-- UPDATE not exposed to clients; dispatch function uses SECURITY DEFINER.
