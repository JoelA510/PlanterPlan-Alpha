-- Migration: Wave 23 — Sync task completion flags (is_complete ↔ status)
-- Date: 2026-04-17
-- Description:
--   Adds a `BEFORE INSERT OR UPDATE` trigger on `public.tasks` that keeps
--   `is_complete` (boolean) and `status = 'completed'` (text) in lockstep.
--
--   Closes the "Dual completion signals" entry in docs/dev-notes.md. Today
--   these two fields are consumed by different triggers:
--     * `check_phase_unlock()`       → reads `is_complete`
--     * `handle_phase_completion()`  → reads `status`
--   If they drift (e.g. raw SQL updates only one side, or a future bug in the
--   app layer), only one downstream trigger fires and phase unlocking silently
--   breaks. This BEFORE trigger is the belt-and-suspenders backstop — the app
--   layer already best-effort mirrors both in `updateStatus`; this guarantees
--   the invariant holds even when a raw SQL write touches only one side.
--
--   Rules:
--     * INSERT:
--         - If NEW.status = 'completed'       → NEW.is_complete := true
--         - Else                              → NEW.is_complete := COALESCE(NEW.is_complete, false)
--     * UPDATE:
--         - Both sides changed in the same write → trust the caller, no-op.
--         - Only status changed   → NEW.is_complete := (NEW.status = 'completed')
--         - Only is_complete changed → NEW.status := CASE WHEN NEW.is_complete THEN 'completed' ELSE 'todo' END
--
--   Ordering: runs BEFORE all AFTER triggers on the same row, so
--   `check_phase_unlock` (AFTER UPDATE OF is_complete) and
--   `handle_phase_completion` (AFTER UPDATE OF status) both see the synced
--   values.
--
--   Revert path:
--     DROP TRIGGER IF EXISTS "trg_sync_task_completion" ON public.tasks;
--     DROP FUNCTION IF EXISTS public.sync_task_completion_flags();

CREATE OR REPLACE FUNCTION public.sync_task_completion_flags()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_status_changed   boolean;
    v_complete_changed boolean;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'completed' THEN
            NEW.is_complete := true;
        ELSE
            NEW.is_complete := COALESCE(NEW.is_complete, false);
        END IF;
        RETURN NEW;
    END IF;

    -- UPDATE path
    v_status_changed   := NEW.status IS DISTINCT FROM OLD.status;
    v_complete_changed := NEW.is_complete IS DISTINCT FROM OLD.is_complete;

    IF v_status_changed AND v_complete_changed THEN
        -- Both sides moving → trust the caller's intent on both fields.
        RETURN NEW;
    END IF;

    IF v_status_changed THEN
        NEW.is_complete := (NEW.status = 'completed');
    ELSIF v_complete_changed THEN
        NEW.status := CASE WHEN NEW.is_complete THEN 'completed' ELSE 'todo' END;
    END IF;

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.sync_task_completion_flags() OWNER TO postgres;

CREATE OR REPLACE TRIGGER "trg_sync_task_completion"
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.sync_task_completion_flags();
