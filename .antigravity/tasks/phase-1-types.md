# Phase 1: Type Safety and API Contracts

**Objective:** Eradicate type masking (`any`, `unknown`, `as { ... }`) to
restore compiler guarantees.

**Source of Truth:**

1. Open and read `Debt-Remediation-Report.md` located in the root directory.
2. Locate the section titled "Type safety and API contracts".
3. Extract the exact list of files and Issue IDs from the "Issue-to-recipe
   mapping" table at the bottom of that section.

**Execution Directive:** Spawn Gemini 3 Flash worker agents to target _only_ the
specific files listed in that table. Instruct them to apply the "Concrete
refactor steps" from the report to resolve Issues 1, 11, 12, 14, 15, 17, 18, 21,
27, 29, and 30.
