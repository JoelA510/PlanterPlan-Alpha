---
description: Perform a comprehensive code review before submitting a Pull Request.
---

# Pre-PR Code Review Workflow

Use this workflow to validate code quality, security, and correctness before opening a PR.

## 1. Context Gathering

First, understand the scope of changes.

1.  **View Diff**: Run `git diff main...HEAD --stat` to see the file list.
2.  **Read Changes**: Use `git diff main...HEAD` (or `git diff main...HEAD | head -n 500` if large) to read the actual code changes.
    - _Tip_: If the diff is too large, view key files individually using `view_file`.

## 2. Automated Checks (Turbo)

// turbo-all

1.  **Lint**: Run `npm run lint` (if available) or check for obvious syntax errors.
2.  **Test**: Run `npm run test` to ensure no regressions.
3.  **Build**: Run `npm run build` to verify compilation.

## 3. Security & Safety Scan

27. **Automated Scan (grep_search)**:
28. 
29. - [ ] **Secrets**: Search for `API_KEY`, `SECRET`, `token`, `password` (fail if hardcoded).
30. - [ ] **Dangerous SQL**: Search for `DELETE FROM` or `DROP TABLE` (fail if missing `WHERE` or `CASCADE` checks).
31. - [ ] **Auth**: Search for public endpoints (verify if intended).
32. - [ ] **Data Loss**: Verify `force: true` or `cascade` usage in migration files.

## 4. Engineering Standards Review

Check against `00-operating-principles.md` and `20-engineering-standards.md`:

- [ ] **No `console.log`**: Remove debug prints.
- [ ] **No `any`**: Ensure strict typing (if TS) or proper validation (if JS).
- [ ] **Error Handling**: Verify try/catch blocks were appropriate.
- [ ] **Performance**: minimal re-renders, no N+1 queries.

## 5. Artifact Generation

Create the standardized review report.

1.  **Create Artifact**: Create/Overwrite `code_review_draft.md` in the project root (ensure it's in `.gitignore`).
2.  **Content Format**:

```markdown
# Code Review Report

## 🛡️ Security Check

- [x/ ] Secrets Check
- [x/ ] Input Validation
- [x/ ] AuthZ/AuthN Verification

## 🏗️ Logic & Correctness

- **Key Changes Verified**:
  - [List major features/fixes]
- **Potential Edge Cases**:
  - [Note any unhandled states]

## ⚡ Performance & Quality

- **Build Status**: [Result of npm run build]
- **Test Status**: [Result of npm run test]
- **Lint/Format**: [Checked?]

## 📝 Recommendations

- [List any blocking issues to fix before merge]
- [List minor nits (optional)]

## ✅ Conclusion

[READY FOR MERGE / CHANGES REQUESTED]
```

## 6. Final Polish

If issues are found:

1.  Fix them immediately in the branch.
2.  Re-run Verification (Step 2).
3.  Update the `code_review_draft.md` artifact.
