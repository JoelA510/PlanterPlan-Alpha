---
description: Debt Manager -> Scan codebase, generate report, sync to GitHub.
---

# Workflow: Debt Manager

## Phase 1: The Scan (Audit)
**Tools:** `grep_search`
**Patterns:**
- `TODO`, `FIXME`, `console.log`
- `any` (TypeScript strictness)
- `!important` (CSS smell)
- `w-[`, `h-[` (Arbitrary Tailwind values)

**Action:**
1. Scan the codebase for these patterns.
2. Create/Overwrite `DEBT_REPORT.md`.
3. Categorize items:
   - **Critical:** Security risks, RLS gaps, Data loss risks.
   - **Correctness:** Logic bugs, missing validation.
   - **Maintenance:** Formatting, duplication, cleanups.

## Phase 2: The Sync (GitHub)
**Action:**
1. Read the generated `DEBT_REPORT.md`.
2. **Fetch:** Get open GitHub issues with label `debt`.
3. **Diff:** Identify items in the Report that are NOT in GitHub.
4. **Create:** For each new item:
   - Call `issue_create(title="[Debt] <Title>", body="<Context>", labels=["debt"])`.
   - Update `DEBT_REPORT.md` with the new Issue Link.

## Phase 3: Conclusion
Output: "Audit complete. X new issues created. Y existing issues tracked."