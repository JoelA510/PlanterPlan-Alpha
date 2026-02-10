---
description: Release Orchestrator -> Documentation, Review, and Verification before PR.
---

# Workflow: Release Prep (The Shipper)

## Phase 1: Documentation Update
1. **Context:** Read `git diff main...HEAD --stat`.
2. **Update Readme:** Run `@README-PROMPT` if architecture changed.
3. **Update Roadmap:** Run `@ROADMAP-PROMPT` to mark items as `✅ Done`.
4. **Update Lessons:** If a bug was fixed, add it to `tasks/lessons.md`.

## Phase 2: The Pre-Flight Check (Automated)
1. **Lint:** `npm run lint` (Must be clean).
2. **Test:** `npm test` (Must pass).
3. **Build:** `npm run build` (Must succeed).
4. **Security Scan:**
   - Grep for `API_KEY`, `SECRET`.
   - Verify `schema.sql` has no irreversible deletes without comments.

## Phase 3: The Artifacts
1. **PR Description:**
   - Run `@PR-PROMPT`.
   - **Constraint:** Must include the "Verification: Regression Suite" table.
2. **Review Report:**
   - Create `code_review_draft.md`.
   - Summarize: "Security Check: Pass/Fail", "Logic Check: Pass/Fail".

## Phase 4: Final Handover
Output:
"Release artifacts generated.
- [x] Docs Updated
- [x] Tests Passed
- [x] PR Description Ready
Run `git push` to deploy."