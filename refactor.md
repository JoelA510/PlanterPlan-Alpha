# Refactoring Playbook (Software + Delivery Flow)

Use this when you want safer change, less complexity, and a measurable win.

## Required inputs (1 page max)

* System scope: repo/service(s), runtime, deploy model, critical user flows.
* Targets: 1-3 metrics with baseline -> goal (e.g., P95 650ms -> 300ms; lead time 5d -> 1d).
* Guardrails: SLOs/SLAs, security/compliance, supported platforms, deadlines, risk tolerance.
* Rollback reality: can you revert quickly (flag, config, deploy rollback), and how fast?

## Step 0 -> Establish minimum confidence (gate)

If any are missing, fix them before refactoring:

* Smoke: build + boot + one critical route/job.
* E2E: one happy path in prod-like env.
* Top behaviors: 10 highest-value cases for the target flows.
* Observability: deploy markers + error rate + latency for target flows + key business event counters.

Gate: do not proceed if you cannot detect breakage within 5-10 minutes of deploy.

## Step 1 -> Baseline + pick the slice (avoid “boil the ocean”)

Capture baseline once:

* Product: P50/P95 latency, error rate, crash-free sessions (if relevant).
* Engineering: CI time, flaky tests count, lead time, change failure rate, MTTR.
* Code signals: churn hotspots, complexity hotspots, largest modules/bundles, slow queries/requests.

Pick one slice that moves the target metric and is shippable in <= 5 small PRs.

## Step 2 -> Map the terrain (where change actually hurts)

Create a quick dependency view (module/service call graph).
Mark nodes with:

* High churn + high complexity
* High blast radius (many callers)
* Incident history / oncall pain
  Target the intersection first.

## Step 3 -> Requirement triage (no anonymous “musts”)

For each requirement/constraint in the slice, record:

* Owner (named), evidence (ticket/contract/policy/customer), last verified date
* Cost to keep vs cost to drop
* Decision: keep / change / deprecate / delete

Write a 1-paragraph ADR per decision that changes scope or behavior.

## Step 4 -> Plan reversible deletions and migrations (default safe)

Prefer: flags, adapters, Strangler Fig, expand/contract DB patterns.
For each delete/deprecate/migrate:

* Proof unused: telemetry query + observation window
* Rollback trigger: explicit threshold + timeframe
* Rollback mechanism: flag flip / revert / restore old path
* Sunset date: when the dead code/flag is physically removed
* Owner + reviewer

Rule: no “soft deprecations” without a sunset date.

## Step 5 -> Simplify before optimizing (reduce surface area first)

Mechanical simplification (no behavior change):

* Reduce parameters/options, remove dead flags, collapse needless indirection.
* Make state explicit; validate at boundaries; avoid hidden singletons.
  Structural simplification:
* Clarify module boundaries; stop cross-cutting reach; simplify I/O schemas.

Rule: keep mechanical refactors separate from behavioral changes (separate PRs).

## Step 6 -> Optimize proven hotspots only (profile -> fix -> remeasure)

* Profile first (CPU, DB, network, bundle).
* Fix top 1-3 bottlenecks only:

  * algorithmic improvements
  * caching with invalidation strategy
  * precompute/denormalize with correctness guardrails
* Remeasure after each change; stop when targets are met.

## Step 7 -> Improve delivery flow (measure flow, not vibes)

Aim for better lead time, lower change failure rate, lower MTTR:

* Reduce batch size: small PRs, short-lived branches, WIP limits.
* Fast CI lane for common changes (<10 min if feasible).
* Review SLA and merge frequency policies that prevent long divergence.

Automation order:

* Tests + lint/type early -> CI gates -> canary/health checks/auto-rollback -> migrations last.

## Done means done (close the loop)

Success requires:

* Target metrics moved, and guardrails did not regress.
* Flags/deprecations hit sunset -> removed.
* Refactor log updated (what changed, why, links to ADRs/PRs, before/after metrics).

---

## Hard stops (anti-patterns)

* Refactor without Step 0 gate.
* Optimize without profiling.
* Delete without telemetry + rollback trigger + sunset.
* Large PRs mixing mechanical refactor + behavior + feature work.

---

## Minimal artifacts (copy/paste)

### ADR (<= 1 paragraph)

```text
Title: <Decision>
Context: <Evidence + last verified date + current cost>
Decision: <What changes, and whether behind flag/adapter>
Consequences: <Expected wins + risks>
Rollback: <Trigger + mechanism>
Owner: <Name/Team>, Reviewer: <Name/Team>
```

### Work item (one slice)

* Goal metric: baseline -> target
* Guardrails to watch:
* Tests/telemetry to add first:
* Plan (<= 5 shippable PRs):
* Rollback plan (trigger + mechanism):
* Sunset dates (flags/deprecations):
