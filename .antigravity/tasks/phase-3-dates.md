# Phase 3: Date Handling Normalization

**Objective:** Centralize date semantics to prevent timezone regressions and
parsing inconsistencies.

**Source of Truth:**

1. Open and read `Debt-Remediation-Report.md` located in the root directory.
2. Locate the section titled "Date handling and time semantics".
3. Extract the exact list of files and Issue IDs from the "Issue-to-recipe
   mapping" table at the bottom of that section.

**Execution Directive:** Spawn Gemini 3 Flash worker agents to target the
specific files listed in that table. Instruct them to apply the "Concrete
refactor steps" from the report to resolve Issues 4, 5, 13, 45, 52, 64, 77, 79,
87, 88, 93, 96, 97, 100, 104, and 105.
