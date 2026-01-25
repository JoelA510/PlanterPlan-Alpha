---
description: Debt Audit -> write DEBT_REPORT.md (no code changes)
---

**Mandatory Scanning Tools:**
   - Use `grep_search` to deterministicly find evidence.
   - Patterns to search: `todo`, `fixme`, `console.log`, `any`, `w-\[`, `!important`.

Produce DEBT_REPORT.md with:

1. Critical (crash/security/data loss)
2. Correctness risks (logic bugs, missing validation)
3. Maintainability (large functions, deep nesting, duplication)
4. Documentation Review:
   - Scan ALL markdown (`.md`) and text documentation files.
   - Identify candidates for consolidation, removal, or archiving (e.g., outdated specs, duplicate prompts).
   - List these candidates in a specific "Documentation Debt" section.
5. Remediation plan in phases

For each item include:
- **Evidence**: Exact line content and line number.
- **Violation**: The rule being broken.
- **Fix**: Concrete suggestion.
Do not modify code.
