---
description: Sync Debt Report items to GitHub Issues
---

1.  **Read Debt Report**
    *   Read `DEBT_REPORT.md` to parse the list of debt items.
    *   Extract Title, Description, and Priority for each item.

2.  **Fetch Existing Debt Issues**
    *   Call `list_issues(labels=["debt"], state="open")` to get currently tracked debt.
    *   Create a set of existing titles to avoid duplicates.

3.  **Sync Items**
    *   For each item in `DEBT_REPORT.md` that is NOT in the existing set:
        *   Call `issue_write(method="create", title=..., body=..., labels=["debt", "maintenance"])`.
        *   Log the new Issue URL.

4.  **Update Report (Optional)**
    *   If the user requests, update `DEBT_REPORT.md` to include links to the newly created issues (e.g., `[Title](IssueURL)`).
