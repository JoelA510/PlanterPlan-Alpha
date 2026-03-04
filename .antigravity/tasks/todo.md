# PlanterPlan-Alpha: Agentic Retrofit & Architectural Audit

**Status:** Active **Objective:** Transform the codebase into a deterministic,
verifiable, and highly constrained sandbox tailored for multi-agent
orchestration via the Antigravity IDE.

## 🚀 Active Execution Pipeline

The following initiatives must be executed in strict sequence to avoid massive
merge conflicts and unstable application states.

### [ ] Phase 1: DbC & RLS Hardening (Priority: HIGH)

**Breakout:** `tasks/breakouts/01-dbc-rls-hardening.md`

- [ ] Implement Zod schema validation across all shared types
      (`src/shared/types/`).
- [ ] Refactor Supabase RLS policies to utilize cached JWT `SELECT` wrappers
      instead of inline `auth.uid()` subqueries.
- [ ] Harden all `SECURITY DEFINER` RPCs against privilege escalation.
- [ ] Integrate automated `pgTAP` database tests into the CI pipeline.

### [ ] Phase 2: ReAct Loop Optimization (Priority: HIGH)

**Breakout:** `tasks/breakouts/02-react-loop-optimization.md`

- [ ] Refactor `scripts/verify-e2e.sh` and `scripts/verify-architecture.sh` to
      support `AGENT_MODE=true` structured JSON outputs.
- [ ] Implement the "Ralph Loop" Stop Hook external validation script.
- [ ] Inject TypeScript Error Middleware to flatten complex generic type errors
      for agent consumption.

### [ ] Phase 3: God Object Decoupling (Priority: MEDIUM)

**Breakout:** `tasks/breakouts/03-god-object-decoupling.md`

- [ ] Shatter the monolithic `AuthContext.tsx` provider into discrete contexts
      (`SessionContext`, `UserProfileContext`, `TenantContext`).
- [ ] Decouple `TaskBoard.tsx` rendering matrices from its domain business logic
      and sorting mathematics.
- [ ] Replace manual `useState` synchronization with a declarative server-state
      management library (e.g., React Query).

### [ ] Phase 4: TDD & BDD Backfilling (Priority: MEDIUM)

**Breakout:** `tasks/breakouts/04-tdd-bdd-backfilling.md`

- [ ] Dispatch Antigravity sub-agents to generate missing Vitest unit tests for
      critical paths (`src/features/**/utils/*.ts`).
- [ ] Map Playwright E2E tests (`e2e/journeys/*.spec.ts`) to strict Gherkin
      syntax using `playwright-bdd`.
- [ ] Configure headless browser Artifact generation (screenshots/traces) for
      the Agent Manager.

### [ ] Phase 5: IPDD Chunking of Real-time Sync (Priority: LOW)

**Breakout:** `tasks/breakouts/05-ipdd-chunking.md`

- [ ] Systematically fracture massive real-time hooks (`useProjectRealtime.ts`,
      `useTaskTree.ts`).
- [ ] Extract logic into Pure State Hooks and Atomic API Utilities.
- [ ] Refactor the original files to act solely as lightweight composition
      layers.
