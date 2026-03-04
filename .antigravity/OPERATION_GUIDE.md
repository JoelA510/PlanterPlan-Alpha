# 🎮 The Antigravity Operational Console

**Version:** 2.1 (Consolidated Architecture & Orchestration) **Purpose:** Master
index of all Agent Workflows and Commands.

## 0. Configuration & Context (The Brain)

| File Path                                        | Purpose              | Update Trigger                                                                                                                                            | Action                                          |
| :----------------------------------------------- | :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------- |
| **`.antigravity/instructions.md`**               | **Global Truth**     | **Manual Update.** Change when Date, Tech Stack (e.g., React 20), or Architecture constraints change.                                                     | _Edit File Manually_                            |
| **`.antigravity/tasks/todo.md`**                 | **Session Focus**    | **Manual Update.** Edit before starting a TDD session to set the Agent's objective. During massive refactors, this acts as the Master Orchestrator index. | _Edit File Manually_                            |
| **`LESSONS.md`**                                 | **Long-Term Memory** | **Agent Update.** The agent writes here after `06-log-lesson`.                                                                                            | _Read Only_                                     |
| **`.antigravity/prompts/SYSTEM-BOOT-PROMPT.md`** | **Session Boot**     | **Start of Session.** Run immediately to load the Persona and Rules.                                                                                      | `@[.antigravity/prompts/SYSTEM-BOOT-PROMPT.md]` |

---

## 1. Inception (Starting Work)

| Workflow File             | Use Case                                                                                      | Command                                         |
| :------------------------ | :-------------------------------------------------------------------------------------------- | :---------------------------------------------- |
| **`01-start-feature.md`** | **Start Here.** You have a Jira ticket, a random idea, or want to pick the next Roadmap item. | `@[.antigravity/workflows/01-start-feature.md]` |

---

## 2. Execution (The Code Loop)

| Workflow File                 | Use Case                                                                                | Command                                             |
| :---------------------------- | :-------------------------------------------------------------------------------------- | :-------------------------------------------------- |
| **`02-test-plan.md`**         | **Plan First.** The feature is complex/risky. You need a written plan before coding.    | `@[.antigravity/workflows/02-test-plan.md]`         |
| **`TDD-PROMPT.md`**           | **Build It.** You have a plan. Enter Red-Green-Refactor mode.                           | `@[.antigravity/prompts/TDD-PROMPT.md]`             |
| **`05-debug-loop.md`**        | **Unblock.** A test is failing and you are stuck in a loop.                             | `@[.antigravity/workflows/05-debug-loop.md]`        |
| **`04-surgical-refactor.md`** | **Quick Fix.** You need to fix one specific Debt item or bug without the full ceremony. | `@[.antigravity/workflows/04-surgical-refactor.md]` |

---

## 3. Maintenance (Health & Debt)

| Workflow File            | Use Case                                                                                    | Command                                        |
| :----------------------- | :------------------------------------------------------------------------------------------ | :--------------------------------------------- |
| **`03-debt-manager.md`** | **Audit.** Scan for `TODOs` and sync them to GitHub Issues.                                 | `@[.antigravity/workflows/03-debt-manager.md]` |
| **`07-design-audit.md`** | **Polish.** The UI looks messy. Scan for hardcoded colors/styles.                           | `@[.antigravity/workflows/07-design-audit.md]` |
| **`06-log-lesson.md`**   | **Remember.** You just solved a nasty bug. Save the solution so the Agent never repeats it. | `@[.antigravity/workflows/06-log-lesson.md]`   |

---

## 4. Release (Shipping)

| Workflow File              | Use Case                                                                  | Command                                          |
| :------------------------- | :------------------------------------------------------------------------ | :----------------------------------------------- |
| **`08-browser-verify.md`** | **Verify.** Run the "Golden Path" browser simulation before shipping.     | `@[.antigravity/workflows/08-browser-verify.md]` |
| **`10-release-prep.md`**   | **Ship It.** Feature is done. Update Docs -> Lint -> Test -> Generate PR. | `@[.antigravity/workflows/10-release-prep.md]`   |

| **`ROADMAP-PROMPT.md`** | **Cleanup.** After merge, mark the Roadmap item as
Done. | `@[.antigravity/prompts/ROADMAP-PROMPT.md]` |

---

## 5. Collaboration

| Workflow File             | Use Case                                         | Command                                         |
| :------------------------ | :----------------------------------------------- | :---------------------------------------------- |
| **`09-remote-review.md`** | **Review.** Review a PR created by someone else. | `@[.antigravity/workflows/09-remote-review.md]` |

---

## 6. Mass Remediation (The Orchestrator Loop)

_For handling 20+ issues or multi-phase refactoring sprints without causing
context window degradation._

| File Path / Workflow     | Use Case                                                                                                                                                         | Action                     |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------- |
| **`tasks/todo.md`**      | **Master Index.** Acts strictly as a phase-tracker. Do not put specific code instructions here.                                                                  | _Manager Reads_            |
| **`tasks/phase-*.md`**   | **Pointer Files.** Breakout files that point to external reports (e.g., `Debt-Remediation-Report.md`) and list specific target files for the current phase only. | _Manager Reads_            |
| **Sub-Agent Delegation** | **Execution.** The Manager reads _one_ phase file at a time, generates the plan, and commands Gemini 3 Flash worker agents to execute the code changes.          | _Manager Commands Workers_ |

---

## 7. Advanced Development Frameworks

_Use these prompts to guide specialized problem-solving, testing, and
implementation strategies._

| Prompt File           | Use Case                                                                                | Command                                   |
| :-------------------- | :-------------------------------------------------------------------------------------- | :---------------------------------------- |
| **`REACT-PROMPT.md`** | **Reasoning & Action.** Use when stuck on complex architectural or debugging problems.  | `@[.antigravity/prompts/REACT-PROMPT.md]` |
| **`DBC-PROMPT.md`**   | **Strict Contracts.** Use when implementing core business logic, API clients, or state. | `@[.antigravity/prompts/DBC-PROMPT.md]`   |
| **`BDD-PROMPT.md`**   | **Behavior Testing.** Use when planning E2E/Integration tests or user-centric features. | `@[.antigravity/prompts/BDD-PROMPT.md]`   |
| **`IPDD-PROMPT.md`**  | **Iterative Execution.** Use for large feature builds requiring verified, atomic steps. | `@[.antigravity/prompts/IPDD-PROMPT.md]`  |
