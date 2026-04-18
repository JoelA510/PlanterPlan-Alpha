-- Migration: Wave 25 — `task_type` discriminator column on public.tasks
-- Date: 2026-04-18
-- Description:
--   Closes the "No type discriminator on `tasks`" entry in docs/dev-notes.md.
--   Adds a narrow text enum derived from `parent_task_id` depth so queries
--   like "all phases" / "all milestones" / "all leaf tasks" can skip the
--   recursive tree walk that the single-table schema otherwise requires.
--
--   Hierarchy (derived from the existing invariants in
--   docs/architecture/tasks-subtasks.md):
--     depth 0  parent_task_id IS NULL                       → 'project'
--     depth 1  parent is project                            → 'phase'
--     depth 2  parent.parent is project                     → 'milestone'
--     depth 3  parent.parent.parent is project              → 'task'
--     depth 4+                                              → 'subtask' (reserved)
--
--   The max-subtask-depth-1 invariant lives in app code. This migration
--   keeps `'subtask'` in the CHECK constraint as a reserved value so future
--   waves can emit it without another DDL change, but `derive_task_type()`
--   returns `'task'` at depth 3 and everything deeper.
--
--   Trigger: `trg_set_task_type` (BEFORE INSERT OR UPDATE OF parent_task_id
--   on public.tasks). It only reads `NEW.parent_task_id`, so it doesn't
--   depend on `NEW.root_id` being populated yet. Alphabetically it sorts
--   before `trg_set_coaching_assignee` and `trg_set_root_id_from_parent`,
--   which is fine — those don't read `NEW.task_type`.
--
--   This migration is purely additive: no existing query is rewritten to
--   consume the column. Backfill covers every existing row.
--
--   Revert path:
--     DROP TRIGGER IF EXISTS "trg_set_task_type" ON public.tasks;
--     DROP FUNCTION IF EXISTS public.set_task_type();
--     DROP FUNCTION IF EXISTS public.derive_task_type(uuid);
--     DROP INDEX IF EXISTS public.idx_tasks_task_type;
--     ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;
--     ALTER TABLE public.tasks DROP COLUMN IF EXISTS task_type;

-- 1. Column + constraint + index --------------------------------------------

ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS task_type text;

ALTER TABLE public.tasks
    DROP CONSTRAINT IF EXISTS tasks_task_type_check;
ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_task_type_check
    CHECK (task_type IS NULL OR task_type IN ('project', 'phase', 'milestone', 'task', 'subtask'));

CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON public.tasks (task_type);

-- 2. derive_task_type helper ------------------------------------------------

CREATE OR REPLACE FUNCTION public.derive_task_type(p_parent_task_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_parent uuid := p_parent_task_id;
    v_grandparent uuid;
    v_great_grandparent uuid;
BEGIN
    -- Depth 0: no parent → project root.
    IF v_parent IS NULL THEN
        RETURN 'project';
    END IF;

    SELECT parent_task_id INTO v_grandparent
      FROM public.tasks
     WHERE id = v_parent;

    -- Depth 1: parent is a project → phase.
    IF v_grandparent IS NULL THEN
        RETURN 'phase';
    END IF;

    SELECT parent_task_id INTO v_great_grandparent
      FROM public.tasks
     WHERE id = v_grandparent;

    -- Depth 2: parent.parent is a project → milestone.
    IF v_great_grandparent IS NULL THEN
        RETURN 'milestone';
    END IF;

    -- Depth 3+: task (and anything deeper — subtask reserved but unused here
    -- because the app enforces max-depth-1 on subtasks, so depth-4 rows
    -- shouldn't exist in practice).
    RETURN 'task';
END;
$$;

ALTER FUNCTION public.derive_task_type(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.derive_task_type(uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.derive_task_type(uuid) TO "authenticated";

-- 3. BEFORE trigger that keeps NEW.task_type in sync -----------------------

CREATE OR REPLACE FUNCTION public.set_task_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    NEW.task_type := public.derive_task_type(NEW.parent_task_id);
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.set_task_type() OWNER TO postgres;

CREATE OR REPLACE TRIGGER "trg_set_task_type"
BEFORE INSERT OR UPDATE OF parent_task_id ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_task_type();

-- 4. Backfill existing rows -------------------------------------------------

UPDATE public.tasks
   SET task_type = public.derive_task_type(parent_task_id)
 WHERE task_type IS NULL;
