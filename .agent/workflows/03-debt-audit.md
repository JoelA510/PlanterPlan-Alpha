---
description: Debt Audit -> write DEBT_REPORT.md (no code changes)
---

Scan repo (exclude node_modules, dist, build artifacts, .git).

Produce DEBT_REPORT.md with:

1. Critical (crash/security/data loss)
2. Correctness risks (logic bugs, missing validation)
3. Maintainability (large functions, deep nesting, duplication)
4. Remediation plan in phases

For each item include: file path, approximate location, what rule it violates, suggested fix.
Do not modify code.
