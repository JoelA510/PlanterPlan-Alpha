# Date Engine Business Calendar ADR

## Status
Accepted for the user-testing tranche, PR H. Implementation is deferred to PR I slices.

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
`src/shared/lib/date-engine`, then introduce a custom `BusinessCalendar`
abstraction in PR I1 without changing behavior. Mirror the abstraction needed by
Supabase Edge utilities before routing `nightly-sync` or other edge scheduling
logic through it.

The first implementation slice must preserve the current calendar-day behavior.
Weekend and regional holiday support require a later explicit product/schema
decision.

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

## Parity Requirements For PR I
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
