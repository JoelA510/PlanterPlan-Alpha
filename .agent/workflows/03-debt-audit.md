---
description: Debt Audit -> write DEBT_REPORT.md (no code changes)
---

5. **Mandatory Scanning Tools:**
6.    - Use `grep_search` to deterministicly find evidence.
7.    - Patterns to search: `todo`, `fixme`, `console.log`, `any`, `w-\[`, `!important`.
8. 
9. Produce DEBT_REPORT.md with:
10. 
11. 1. Critical (crash/security/data loss)
12. 2. Correctness risks (logic bugs, missing validation)
13. 3. Maintainability (large functions, deep nesting, duplication)
14. 4. Documentation Review:
15.    - Scan ALL markdown (`.md`) and text documentation files.
16.    - Identify candidates for consolidation, removal, or archiving (e.g., outdated specs, duplicate prompts).
17.    - List these candidates in a specific "Documentation Debt" section.
18. 5. Remediation plan in phases
19. 
20. For each item include:
21. - **Evidence**: Exact line content and line number.
22. - **Violation**: The rule being broken.
23. - **Fix**: Concrete suggestion.
24. Do not modify code.
