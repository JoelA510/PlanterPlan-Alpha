# Phase 2: Architecture Boundaries (FSD) & Constants

**Objective:** Fix dependency cycles and centralize domain literals into
`src/shared/constants/`.

**Source of Truth:**

1. Open and read `Debt-Remediation-Report.md` located in the root directory.
2. Locate the section titled "Architecture boundaries and domain constants".
3. Extract the exact list of files and Issue IDs from the "Issue-to-recipe
   mapping" table at the bottom of that section.

**Execution Directive:** Spawn Gemini 3 Flash worker agents to target the
specific files listed in that table. Instruct them to apply the "Concrete
refactor steps" from the report to resolve Issues 3, 6, 19, 23, 31, 32, 33, 36,
44, 46, 50, 54, 58, 60, 62, 63, 65, 81, 84, 98, and 101.
