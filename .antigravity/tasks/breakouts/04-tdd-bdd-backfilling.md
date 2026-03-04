# .antigravity/tasks/breakouts/04-tdd-bdd-backfilling.md

**Status:** Pending **Priority:** MEDIUM

## 🎯 Objective

Establish rigorous, automated verification mechanisms ("red/green" feedback
loops) required by autonomous agents to mathematically prove functional
correctness before committing code.

## 🛠️ Execution Steps

### 1. Retroactive TDD Backfilling

**Target:** `src/features/**/utils/*.ts`, UI components, and Database RPCs.

- Utilize a static analysis tool to generate an Abstract Syntax Tree (AST) that
  maps critical paths and identifies functions lacking corresponding `.test.ts`
  files.
- Utilize the Antigravity Agent Manager to dispatch specialized testing
  sub-agents to these identified gaps.
- Enforce strict tooling constraints on these sub-agents: `Vitest` for unit
  logic, Playwright Component Testing for UI components, and `pgTAP` combined
  with Basejump test helpers for database RLS validation.
- Instruct the agents to intentionally observe failing ("red") states when
  asserting future behavior, or passing ("green") states to lock in current
  application behavior.

### 2. BDD Alignment & Gherkin Translation

**Target:** `e2e/journeys/*.spec.ts`

- Bridge the translation gap between product requirements and execution matrices
  by adopting a strict Gherkin syntax (Given, When, Then).
- Refactor the existing imperative Playwright tests by mapping them directly to
  `.feature` files using frameworks like `playwright-bdd` or specialized testing
  agents like OpenQA.
- Ensure these `.feature` files become the primary input vector (prompts) for
  the coding agent.

### 3. Artifact Generation via Playwright MCP

**Target:** Antigravity UI / CI Output

- Integrate the Playwright Model Context Protocol (MCP) to allow agents to
  execute tests autonomously in a headless browser.
- Configure the test runner to automatically capture visual screenshots of
  passing BDD steps, record browser sessions, and output `.trace.zip` files.
- Ensure these assets are presented to the human architect as verified
  "Artifacts" within the Agent Manager.

## 🚦 Verification (Completion Promise)

The agent may only mark this task as complete when:

1. Sub-agents generate JSON coverage reports confirming that unit logic and
   database constraints have associated passing tests.
2. Playwright successfully executes the newly generated Gherkin `.feature` files
   and produces a verifiable browser session video recording or DOM snapshot
   diff.
3. The Ralph Loop script verifies a zero exit code from both test suites and
   accepts the `{"status": "SUCCESS", "message": "<promise>COMPLETE</promise>"}`
   payload.
