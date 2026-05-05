# User-Testing Baseline

This document records the user-testing gap-closure baseline for the PR series
that starts after PR A (`test: stabilize release baseline`). It is a planning
and release-control source of truth: it does not claim the target behavior is
implemented until the matching PR lands.

## Source Status

Verified primary-source facts from the planning pass:

* The public Notion root page and public subpages `archive`, `Spec md`, and
  `temp` were accessible. Relevant linked Notion task pages for due-date
  engine, dashboard, project creation from template, template-note copying,
  and item details were also inspected.
* Direct Notion database row querying was not available, so row-level evidence
  came from Notion search and direct page fetches.
* Notion-backed requirements found in that pass: project creation from
  template is in progress or buggy, template notes must not copy into project
  items, date-engine work is in progress, and item detail behavior differs
  between projects and templates.
* Notion did not directly state "kill dashboard" or "remove comments from the
  project task view"; those are accepted prompt directives for this tranche.

Repo baseline after PR A:

* Mainline CI has a required release E2E smoke suite (`npm run
  test:e2e:release`) covering login, signup, login validation, and blank
  project creation. The legacy full BDD suite remains available as
  `npm run test:e2e`, but it is not the required release gate because it
  contains stale broad scenarios that assume unseeded data.
* `initialize_default_project` is characterized by pgTAP baseline tests:
  blank project creation creates owner membership, six phases, and the current
  scaffold shape.
* `clone_project_template` is characterized in its current state, including
  the known note-copy behavior that PR G must intentionally change.

## Accepted Target Directives

These directives guide the ordered PR series. If a future Notion source or
owner decision conflicts, prefer a smaller reversible PR plus characterization
coverage before changing behavior.

* Remove the project dashboard as a product surface. Move project/template
  creation entry points first, then remove `/dashboard` and its pipeline board.
* Project lifecycle should be derived from task state. Manual project state
  changes through drag/drop pipeline controls must be removed after a derived
  read-only replacement exists.
* Remove comments from the project task detail UI first. Keep
  `task_comments`, RLS, realtime, and notification plumbing intact unless a
  later explicit data-retention decision says otherwise.
* Coaching task and strategy-template flags must be editable only on template
  rows. Project instances may retain inherited read-only badges/behavior, but
  instance create/update paths must not mutate those flags.
* Template-to-project creation/import must be characterized and fixed so
  hierarchy, ordering, settings, clone metadata, and displayed project state
  are consistent.
* Template notes must not copy into project items.
* Date-engine work must start with characterization and an ADR. The selected
  direction is to keep `date-fns` constrained to the app date-engine layer and
  add a custom business-calendar abstraction with mirrored edge-function
  utilities before changing behavior.

## Current Implementation Gaps

| Area | Current implementation | Target gap | Planned PR |
| --- | --- | --- | --- |
| Dashboard | PR D redirects `/dashboard` to `/tasks`, removed the dashboard page and pipeline board, and keeps creation on `/tasks?action=...`. | Product dashboard surface is no longer a user-facing route. | Done PR D |
| Project state | PR D removed generic project lifecycle status mutation from user surfaces; archive remains a visibility-only root-status flag. | Lifecycle badges/selectors derive from child task state; archive remains visibility-only unless product revises it. | Done PR D |
| Comments | `TaskDetailsView` still renders `TaskComments` in project task detail. | Project-context task detail hides comments; backend unchanged. | PR E |
| Coaching flag | Current UI exposes `settings.is_coaching_task` editing on instance tasks. | Edit only on templates; instances preserve inherited behavior read-only. | PR F |
| Strategy flag | Current UI exposes `settings.is_strategy_template` editing on instance tasks. | Edit only on templates; instances preserve inherited behavior read-only. | PR F |
| Template clone | `clone_project_template` copies task notes into instance clones. | Instance clones receive blank notes while preserving approved metadata. | PR G |
| Date engine | Custom UTC/date-only engine uses `date-fns` and lacks business-calendar/weekend/holiday abstraction. | Add ADR, characterization, and business-calendar abstraction before behavior changes. | PR H, PR I+ |

## Release Rules

Every PR in this tranche must:

* branch from current `main`;
* change one behavior slice only;
* add characterization before high-risk refactors;
* update docs and tests in the same PR as behavior changes;
* run the narrowest useful validation first, then broader validation;
* follow the 5-minute / 10-minute PR comment and CI loop before merge.

Do not start PR D until creation works without `/dashboard`.
