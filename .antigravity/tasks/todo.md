# PlanterPlan-Alpha: Agentic Retrofit & Architectural Audit

**Status:** Active **Objective:** Transform the codebase into a deterministic,
verifiable, and highly constrained sandbox tailored for multi-agent
orchestration via the Antigravity IDE.

## 🚀 Active Execution Pipeline

### [x] Phase 1: DbC & RLS Hardening (Priority: HIGH)

**Breakout:** `tasks/breakouts/01-dbc-rls-hardening.md`

- [x] Implement Zod schema validation across all shared types
      (`src/shared/types/`).
- [x] Refactor Supabase RLS policies to utilize cached JWT `SELECT` wrappers
      instead of inline `auth.uid()` subqueries.
- [x] Harden all `SECURITY DEFINER` RPCs against privilege escalation.
- [x] Integrate automated `pgTAP` database tests into the CI pipeline.
- **[ ] FOLLOW-UP:** Create a universal `public.has_permission` helper in
  `schema.sql` and refactor all hardened RPCs to utilize it. Update `pgTAP`
  tests accordingly.

### [x] Phase 2: ReAct Loop Optimization (Priority: HIGH)

**Breakout:** `tasks/breakouts/02-react-loop-optimization.md`

- [x] Refactor `scripts/verify-e2e.sh` and `scripts/verify-architecture.sh` to
      support `AGENT_MODE=true` structured JSON outputs.
- [x] Implement the "Ralph Loop" Stop Hook external validation script.
- [x] Inject TypeScript Error Middleware to flatten complex generic type errors
      for agent consumption.

### [x] Phase 3: God Object Decoupling (Priority: MEDIUM)

**Breakout:** `tasks/breakouts/03-god-object-decoupling.md`

- [x] Shatter the monolithic `AuthContext.tsx` provider into discrete contexts
      (`SessionContext`, `UserProfileContext`, `TenantContext`).
- [x] Decouple `TaskBoard.tsx` rendering matrices from its domain business logic
      and sorting mathematics.
- [x] Replace manual `useState` synchronization with a declarative server-state
      management library (e.g., React Query).

### [ ] Phase 4: TDD & BDD Backfilling (Priority: MEDIUM)

**Breakout:** `tasks/breakouts/04-tdd-bdd-backfilling.md`

- [x] Dispatch Antigravity sub-agents to generate missing Vitest unit tests for
      critical paths (`src/features/**/utils/*.ts`).
- [x] Map Playwright E2E tests (`e2e/journeys/*.spec.ts`) to strict Gherkin
      syntax using `playwright-bdd`.
- [x] Configure headless browser Artifact generation (screenshots/traces) for
      the Agent Manager.
- **[ ] FOLLOW-UP:** Write rigorous, DOM-independent Vitest `.test.ts` files for
  the pure sorting and drag-and-drop math algorithms extracted from
  `TaskBoard.tsx`.

### [ ] Phase 5: IPDD Chunking of Real-time Sync (Priority: LOW)

**Breakout:** `tasks/breakouts/05-ipdd-chunking.md`

- [x] Systematically fracture massive real-time hooks (`useProjectRealtime.ts`,
      `useTaskTree.ts`).
- [x] Extract logic into Pure State Hooks and Atomic API Utilities.
- [x] Refactor the original files to act solely as lightweight composition
      layers.
- **[ ] FOLLOW-UP:** Audit `useTaskTree.ts` referential flow to ensure the
  `hydratedProjects` parameter is strictly driven by the React Query cache
  without manual `useState` interception.

### [ ] Phase 6: Final Codebase Verification Audit (Priority: CRITICAL)

**Breakout:** Direct Manager Orchestration

- [ ] **Security & DbC:** Execute all `pgTAP` tests and run strict type-checks
      to guarantee Zod DbC schemas.
- [ ] **Architecture & Loop:** Trigger `verify-architecture.sh` to confirm FSD
      compliance and ensure test runner scripts output strictly typed JSON.
- [ ] **Testing & Synchronization:** Run the full `Vitest` unit test suite and
      `Playwright` BDD tests with zero permitted failures. Ensure the Ralph Loop
      mathematical completion promise is emitted.
