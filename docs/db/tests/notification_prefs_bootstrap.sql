-- EXPECT: inserting a new auth.users row materializes a notification_preferences row via trg_bootstrap_notification_prefs
--
-- Wave 30 Task 1: verify the bootstrap trigger fires and the new prefs row
-- carries the documented defaults. Run with the service-role key or as
-- superuser so the auth.users INSERT isn't blocked by RLS.
--
-- Wrap in BEGIN/ROLLBACK so repeated execution is idempotent.

BEGIN;

-- SETUP: insert a synthetic auth.users row with a deterministic uuid.
DO $$
DECLARE
    v_uid uuid := '00000000-0000-0000-0000-00000000bbbb';
    v_prefs public.notification_preferences%ROWTYPE;
BEGIN
    INSERT INTO auth.users (id, email) VALUES (v_uid, 'notif-bootstrap-smoke@test.local');

    SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = v_uid;
    IF v_prefs IS NULL THEN
        RAISE EXCEPTION '[FAIL] notification_preferences row was not bootstrapped for new user';
    END IF;

    -- Canonical defaults per the migration header.
    IF v_prefs.email_mentions        IS DISTINCT FROM true   THEN RAISE EXCEPTION '[FAIL] email_mentions default drifted'; END IF;
    IF v_prefs.email_overdue_digest  IS DISTINCT FROM 'daily' THEN RAISE EXCEPTION '[FAIL] email_overdue_digest default drifted'; END IF;
    IF v_prefs.email_assignment      IS DISTINCT FROM true   THEN RAISE EXCEPTION '[FAIL] email_assignment default drifted'; END IF;
    IF v_prefs.push_mentions         IS DISTINCT FROM true   THEN RAISE EXCEPTION '[FAIL] push_mentions default drifted'; END IF;
    IF v_prefs.push_overdue          IS DISTINCT FROM true   THEN RAISE EXCEPTION '[FAIL] push_overdue default drifted'; END IF;
    IF v_prefs.push_assignment       IS DISTINCT FROM false  THEN RAISE EXCEPTION '[FAIL] push_assignment default drifted'; END IF;
    IF v_prefs.timezone              IS DISTINCT FROM 'UTC'  THEN RAISE EXCEPTION '[FAIL] timezone default drifted'; END IF;

    RAISE NOTICE '[OK] bootstrap trigger materialized prefs row with canonical defaults';
END $$;

-- Cleanup (rollback handles it too, but be explicit).
DELETE FROM auth.users WHERE email = 'notif-bootstrap-smoke@test.local';

ROLLBACK;
