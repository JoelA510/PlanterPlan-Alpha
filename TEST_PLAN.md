# TEST_PLAN: Mass Remediation Phase 1

## Objective

Ensure existing Vitest suites do not break after type safety and API contract
refactors across the Phase 1 target files. Ensure adherence to
`architect-standards.md` and repository rules.

## Strategy & Frameworks

We utilize the following advanced development frameworks to guide testing and
remediation:

- **Design-by-Contract (DbC)**: Ensuring all inputs/outputs strictly match
  `database.types.ts`.
- **Behavior-Driven Development (BDD)**: Grounding UI tests in actual user
  workflows.
- **Iterative Prompt-Driven Development (IPDD)**: Step-by-step verified code
  generation.
- **The ReAct Framework**: Reason + Act methodology for AI-driven debugging.

1. **Pre-Refactor Baseline:**
   - Run `npx vitest run` or `npm run test` to ensure all existing tests are
     passing before initiating file changes with the worker agents.
2. **TypeScript Compilation Check:**
   - Run `npx tsc --noEmit` on the modified files to verify that all type
     masking (`any`, `unknown`) has been properly eradicated and replaced with
     strict TS definitions.
3. **Automated Verification Post-Refactor:**
   - Run the full Vitest suite again (`npx vitest run`) after agents complete
     their modifications.
   - Run ESLint `npm run lint` across the repo to verify boundary and import
     hygiene.
4. **Architectural Evaluation:**
   - Evaluate Validation Logs of output agents against `rules.md` (checking
     specifically for eradication of `any/unknown`, strict FSD lateral bans, and
     zero raw `new Date()`).
5. **Rollback Condition:**
   - If tests fail, output rejection to the worker agent and demand
     `.antigravity/workflows/05-debug-loop-5.md` execution.
