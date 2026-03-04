# Refactor Sprint: Debt Remediation

**Orchestration Protocol for Lead Architect:** You are managing a massive
105-issue debt remediation sprint. To avoid context degradation, you are
forbidden from processing all tasks at once. Follow this strict execution loop:

1. Look at the `Active Phases` list below. Find the first Phase that is NOT
   marked `[x]`.
2. Read the specific breakout file linked to that Phase to load its specific
   objectives and constraints.
3. Generate the `implementation_plan.md` and `TEST_PLAN.md` for _only_ that
   Phase. Await human approval.
4. Spawn Gemini 3 Flash worker agents to execute the tasks within that Phase.
5. Review their work. Once the Phase is 100% complete and verified, mark it
   `[x]` here, clear your worker context, and proceed to the next Phase.

## Active Phases

- [x] **Phase 1: Type Safety & Contracts** -> Read `tasks/phase-1-types.md`
- [x] **Phase 2: Architecture & FSD** -> Read `tasks/phase-2-fsd.md`
- [x] **Phase 3: Date Handling** -> Read `tasks/phase-3-dates.md`
- [x] **Phase 4: Forms & Validation** -> Read `tasks/phase-4-forms.md`
- [x] **Phase 5: Performance & Network** -> Read `tasks/phase-5-perf.md`
- [x] **Phase 6: Auth, Errors, & Hygiene** -> Read `tasks/phase-6-auth.md`
