# Context Ignore Recommendations

The following files are generated or tracked for AI context and historical record keeping, but are not critical for a human code review of the current feature set. They can be safely ignored or deprioritized by reviewers to save context/focus.

- **`PR_DESCRIPTION_DRAFT.md`**: Draft content for the PR description (Root).
- **`DEBT_REPORT.md`**: A comprehensive log of technical debt and linting issues.
- **`docs/operations/ENGINEERING_KNOWLEDGE.md`**: A cumulative knowledge base; check only if solving a complex architectural problem.
- **`browser_audit.json`**: Automated verification logs.
- **`docs/db/drafts/*`**: Work-in-progress SQL scripts.
- **`.agent/*`**: AI Agent configuration, rules, and workflows.
- **`archive/*`**: Old code and documentation.
- **`supabase/seeds/*`**: Large seed files (unless modifying data initialization).
