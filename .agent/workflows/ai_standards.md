---
description: Standards for AI-driven development, documentation, and PR generation.
---

# AI Development Standards

This workflow defines the mandatory steps and references for all development tasks in this repository.

## 1. Feature Planning & Implementation

**Trigger:** Before writing any code or estimating a task.

1.  **Consult Knowledge Base**: Read `docs/ENGINEERING_KNOWLEDGE.md`.
    - Check for existing patterns (e.g., "Deep Clone", "Recursive RLS").
    - Ensure new code does not violate "Critical Rules".
2.  **Update Roadmap**: Check `roadmap.md` to align with current phases.

## 2. Documentation Updates

**Trigger:** Writing or updating `README.md`.

1.  **Use the Template**: All README changes must strictly follow `docs/README-TEMPLATE.md`.
2.  **Use the Prompt**: If generating content, use the instructions in `docs/README-PROMPT.md`.
    - _Constraint_: Evidence Rule (Link files or don't claim it).
    - _Constraint_: No marketing fluff.

## 3. Pull Request Generation

**Trigger:** Preparing to submit work.

1.  **Use the Template**: The PR Description must mirror `docs/PR-TEMPLATE.md`.
2.  **Use the Prompt**: Feed the diff and `docs/PR-PROMPT.md` to the LLM to generate the description.
    - _Section_: Roadmap Progress (Update status).
    - _Section_: Risk Assessment (High/Medium/Low).
    - _Section_: Verification Plan (Seed data is mandatory).

---

_Run this workflow check before every final submission._
