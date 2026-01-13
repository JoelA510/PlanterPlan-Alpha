---
description: Perform a deep AI review of a remote Pull Request using GitHub MCP
---

1.  **Fetch PR Context**
    *   Use `pull_request_read(method="get", ...)` to get the high-level summary.
    *   Use `pull_request_read(method="get_files", ...)` to see the file list.
    *   Use `pull_request_read(method="get_diff", ...)` to get the actual changes.

2.  **Analyze against Standards**
    *   Load `user_rules` (specifically `20-engineering-standards.md` and `30-design-standards.md`).
    *   For each file change, check:
        *   **Type Safety**: Are there explicit types? Is `any` avoided?
        *   **Styling**: Is Tailwind used exclusively? Are generic colors avoided?
        *   **Architecture**: Are feature slices respected? No circular dependencies?
        *   **Security**: Are there any sensitive inputs handled without validation?

3.  **Submit Review**
    *   If **Critical Issues** (Security, Breaking Architecture):
        *   Use `pull_request_review_write(event="REQUEST_CHANGES", ...)`
        *   Post specific comments on the offending lines using `pull_request_review_write(body=..., path=..., line=...)`.
    *   If **Minor Issues** (Nitpicks, suggestions):
        *   Use `pull_request_review_write(event="COMMENT", ...)`
    *   If **Perfect**:
        *   Use `pull_request_review_write(event="APPROVE", body="LGTM! Checked against Engeering Standards.", ...)`
