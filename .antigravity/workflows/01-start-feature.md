---
description: Universal Entry Point -> Start a new feature or task.
---

# Workflow: Start Feature
**Context:** You are the Principal Architect initializing a new unit of work.

## Phase 1: Source Identification
Ask the user: "What is the source of this work?"
1. **Roadmap Auto-Select**: Read `roadmap.md`, pick the first `🚧 In Progress` or `📅 Planned` item.
2. **GitHub Issue**: User provides an Issue #. (Fetch details via GitHub tool).
3. **Ad-Hoc Request**: User provides a raw description.

## Phase 2: Analysis & Scope
1. **Architecture Check:**
   - Read `docs/ARCHITECTURE.md` and `.antigravity/instructions.md`.
   - **Crucial:** Does this feature touch Schema, RLS, or the Date Engine?
   - If YES: Draft a "Safety Plan" listing the specific constraints.
2. **Knowledge Retrieval:**
   - Read `tasks/lessons.md`. Are there past bugs (e.g., [RLS-001]) relevant to this feature?

## Phase 3: The Plan (Artifact)
Create/Overwrite `implementation_plan.md`:
- **Objective:** One sentence summary.
- **Proposed Changes:** List files to create/modify.
- **Verification Plan:**
  - Automated: Which test file will be created?
  - Manual: What is the "Golden Path" to click through?

## Phase 4: Git Setup
1. **Branching:**
   - Syntax: `feat/<id>-<short-name>` (e.g., `feat/p-12-task-drag`).
   - Command: `git checkout -b <branch_name>`.
2. **Tracking:**
   - Update `tasks/todo.md` with the new objective.

## Phase 5: Handover
Output: "Plan created. Branch active. Ready to execute TDD?"