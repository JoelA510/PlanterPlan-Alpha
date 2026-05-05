# Date Engine Business Calendar ADR

## Status
Accepted for the user-testing tranche. PR H recorded the decision and
characterization net. PR I1 added the app/edge business-calendar interfaces
with calendar-day behavior. PR I2 routes active scheduling and urgency callers
through the seam without changing behavior.

## Context
PlanterPlan currently centralizes app date math in `src/shared/lib/date-engine`.
That layer uses `date-fns` wrappers plus custom UTC/date-only helpers. Supabase
Edge functions cannot import the app tree, so `supabase/functions/_shared/date.ts`
mirrors the small set of edge-safe date helpers used by `nightly-sync`,
supervisor reports, and ICS feeds.

The current behavior is calendar-day based. It does not skip weekends or
regional holidays. Checkpoint projects suppress date shifting and urgency, while
template forms keep relative `days_from_start` / duration authoring instead of
instance schedule writes.

## Decision
Keep the existing `date-fns` dependency constrained to
`src/shared/lib/date-engine`, introduce a custom `BusinessCalendar`
abstraction, and route runtime scheduling callers through it without changing
behavior. Mirror the abstraction needed by Supabase Edge utilities before any
weekend or holiday rule changes.

The first implementation slice must preserve the current calendar-day behavior.
Weekend and regional holiday support require a later explicit product/schema
decision.

## PR I1 Implementation
PR I1 adds:

* `src/shared/lib/date-engine/business-calendar.ts`, exported through the app
  date-engine package path for direct imports;
* `supabase/functions/_shared/business-calendar.ts`, the Deno edge mirror;
* app, edge, and parity tests proving the `calendar-day` implementation keeps
  Friday + 1 business day as Saturday and treats weekends as business days.

PR I1 does not route scheduling, urgency, nightly-sync, recurrence, or ICS
logic through the new seam. PR I2 owns that no-behavior-change migration.

## PR I2 Implementation
PR I2 routes current runtime callers through the app/edge seams:

* `calculateScheduleFromOffset`, `recalculateProjectDates`, and `deriveUrgency`
  use `defaultBusinessCalendar` while normalizing date-only inputs to explicit
  UTC midnight where hierarchy scheduling depends on `YYYY-MM-DD` semantics;
* `supabase/functions/ics-feed/ics.ts` advances all-day `DTEND` through the
  edge business-calendar seam;
* `supabase/functions/nightly-sync/urgency.ts` computes due-soon cutoffs
  through the edge business-calendar seam while preserving the current UTC
  time-of-day threshold behavior;
* characterization tests keep weekend-inclusive calendar-day behavior locked.

PR I2 intentionally does not change recurrence evaluation or clone scheduling.
Those paths already operate on UTC `YYYY-MM-DD` stamps and remain covered by
the parity requirements below.

## Rationale
This is the safest path for PlanterPlan because current behavior depends on:

* UTC/date-only persistence and display-independent math;
* project hierarchy rollups and bulk shift rules;
* checkpoint project exclusions;
* template exclusions from instance date writes;
* nightly-sync parity for urgency and recurrence clone scheduling;
* future holiday support that must work in both the browser app and Deno Edge.

A thin app/edge business-calendar interface gives tests a stable seam without
moving to local-time package semantics or broadening the dependency surface.
PR I must explicitly audit date-only string parsing in the current `date-fns`
wrappers before routing business-calendar behavior through them, because local
timezone parsing can differ from the Edge helpers' explicit `Date.UTC`
constructors.

## Rejected Alternatives
* **Add a business-day package now:** rejected because holiday calendars, Deno
  parity, and UTC/date-only behavior would still need custom code.
* **Replace the engine with a package-first implementation:** rejected because
  it creates high regression risk across hierarchy shifts, checkpoint projects,
  and template exclusions before the characterization net is complete.
* **Leave the engine as-is:** rejected because it leaves no explicit seam for
  weekend/holiday rules or edge parity tests.

## Parity Requirements For PR I+
* App and edge helpers must agree on `YYYY-MM-DD`, UTC month keys, UTC-midnight
  truncation, and checkpoint project detection.
* `nightly-sync` overdue/due-soon transitions must preserve checkpoint
  exclusions and current threshold semantics until a product-approved behavior
  change lands.
* Recurrence clones must continue stamping UTC `YYYY-MM-DD` values and must not
  copy recurrence rules into instances.
* Template create/update payloads must continue to avoid instance schedule
  writes; project instances must keep derived dates.
* Any weekend/holiday configuration must be testable without relying on local
  timezone or runtime locale.

## PR H Characterization
PR H adds tests that lock:

* no direct `date-fns` imports outside `src/shared/lib/date-engine`;
* app/edge parity for UTC date helpers and checkpoint detection;
* current calendar-day arithmetic, including weekend-inclusive day addition;
* existing template exclusion and checkpoint carve-out coverage.

## PR I1 Characterization
PR I1 adds tests that lock:

* the app and edge default business calendar to the `calendar-day`
  implementation;
* weekend-inclusive "business day" behavior;
* app/edge parity for `addBusinessDays`, `diffInBusinessDays`, and
  `isBusinessDay` on valid date-only inputs.

## PR I2 Characterization
PR I2 adds tests that lock:

* schedule offsets and project date shifts routed through the seam still count
  weekends as calendar days;
* full ISO root dates normalize through UTC date-only scheduling;
* ICS all-day `DTEND` stays one calendar day after `due_date`;
* nightly-sync due-soon thresholds preserve UTC time-of-day while routing the
  date portion through the edge business-calendar seam.
