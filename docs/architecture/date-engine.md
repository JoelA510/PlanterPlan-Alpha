# docs/architecture/date-engine.md

## Domain Overview
The Date Engine is an autonomous logic layer that calculates task urgency based on specific time horizons, dynamically adjusts cascading dates, and restricts temporal boundaries based on Project settings and item inheritance.

## Core Entities & Data Models
* **Date Status:** Computed state indicating urgency (Not Yet Due, Current, Due Soon, Overdue).
* **Time Horizons:** Configured globally per project (e.g., `Due soon = 2 days`).
* **Payload Helpers:** Utilities that construct valid date ranges based on parent/child limits.

## State Machines / Lifecycles
### Urgency Status Lifecycle
Calculated dynamically based on system time vs. Task End Dates:
1. **Not Yet Due:** Current date is prior to the active horizon.
2. **Current:** Task is within the active window.
3. **Due Soon:** Task End Date falls within the project's configured `Due soon time horizon`.
4. **Overdue:** Current date has passed the End Date, and the task is not marked complete (`status !== 'completed'`). *Wave 23 note:* `is_complete` and `status === 'completed'` are kept in lockstep by the `sync_task_completion_flags` DB trigger (see `tasks-subtasks.md`), so either field can be used safely — `status` is the canonical check.

## Business Rules & Constraints
* **Cascading Logic:** Phase and Milestone due dates are dynamically calculated based on the furthest due dates of their underlying child tasks.
* **Global Date Shifts:** Editing the Project-level due date automatically shifts the due dates of *all* nested Phases, Milestones, and Tasks to preserve relative spacing.
* **Dependency Auto-Adjustment:** Modifying a task date or moving an item via drag-and-drop (`dateInheritance.ts`) strictly conforms to parent bounds and auto-adjusts dependent child items.
* **Template Exclusion:** The Date Engine is entirely disabled for Library Templates. Template tasks use `duration` and `days from start until due`.
* **Checkpoint projects (Wave 29):** `recalculateProjectDates` and `deriveUrgencyForProject` short-circuit when the project root carries `settings.project_kind === 'checkpoint'`; nightly-sync skips urgency transitions for those roots; due dates render as informational only. `isCheckpointProject` is lock-step with `supabase/functions/_shared/date.ts`.
* **Wave 31:** display-time date formatting uses `formatDateLocalized` from `src/shared/i18n/formatters.ts` (Intl `DateTimeFormat` / `RelativeTimeFormat` with per-locale caches). Internal math stays UTC-anchored ISO strings here in `date-engine/index.ts` — `compareDateAsc`, `isBeforeDate`, `formatDisplayDate`, cascade/rollup calculations, etc. Don't conflate the two: calling `formatDateLocalized` in a comparator silently breaks sort stability across locales; calling `formatDisplayDate` in JSX silently renders the wrong language.
* **Business-calendar seam (PR I1/I2):** `src/shared/lib/date-engine/business-calendar.ts` and `supabase/functions/_shared/business-calendar.ts` expose app/edge `BusinessCalendar` interfaces. The default implementation is `calendar-day`, which intentionally treats every valid date including weekends as a business day. App schedule offsets, global project shifts, display urgency, ICS all-day `DTEND`, and nightly-sync due-soon cutoffs route through the seam without changing current calendar-day behavior.

## Integration Points
* **Tasks & Subtasks:** The drag-and-drop system relies heavily on the Date Engine to recalculate bounds when items are moved.
* **Task surfaces and reports:** Feeds due-soon and overdue display state to
  task lists, project views, Gantt, reports, and admin analytics.
* **Nightly CRON (Wave 20):** `supabase/functions/nightly-sync/` owns the *write* path for urgency-status transitions (`not_started` → `in_progress` → `due_soon` → `overdue`) using per-project `settings.due_soon_threshold`. Due-soon threshold dates route through `supabase/functions/nightly-sync/urgency.ts` and the edge business-calendar seam while preserving the original UTC time-of-day. The app-layer Date Engine computes urgency for display (`deriveUrgency`) but no longer writes status to the DB itself. See `supabase/functions/nightly-sync/README.md`.
* **Gantt drag-shift (Wave 28):** `src/features/gantt/hooks/useGanttDragShift.ts` validates bounds via `isBeforeDate`/`compareDateAsc`, then routes through `useUpdateTask`. Cascade-up logic in `updateParentDates` unchanged.
* **Decision record (PR H/I1/I2):** `docs/architecture/date-engine-business-calendar-adr.md` records the accepted direction: keep `date-fns` inside the app date-engine layer, add a custom business-calendar seam, and route app/edge scheduling callers through it before any weekend/holiday behavior change.

## Known Gaps / Technical Debt
* Algorithms for auto-adjusting dates currently lack logic for skipping weekends and regional holidays.
* **User-testing tranche direction (PR H, PR I+):** PR H added the decision
  record and characterization tests. PR I1 added the app/edge business-calendar
  seam with no runtime behavior change. PR I2 routes active app/edge scheduling
  callers through that seam while keeping calendar-day behavior. Later PR I
  slices must preserve UTC/date-only semantics, checkpoint-project exclusions,
  template exclusions, task hierarchy rollups, and `nightly-sync` / edge utility
  parity before any product-approved weekend/holiday behavior change.
