---
description: Run the full E2E test suite by iterating each spec file individually and recording pass/fail results.
---

// turbo-all

Run each E2E spec file one at a time using Playwright. Record the exit code for each file.

**Pre-requisite**: Ensure the dev server is running (`npm run dev` on port 3000).

1. Run `npx playwright test e2e/auth.spec.ts --project=chromium --reporter=line 2>&1 | tail -5` and record the result as PASS (exit 0) or FAIL (non-zero).

2. Run `npx playwright test e2e/security.spec.ts --project=chromium --reporter=line 2>&1 | tail -5` and record the result.

3. Run `npx playwright test e2e/theme-integrity.spec.ts --project=chromium --reporter=line 2>&1 | tail -5` and record the result.

4. Run `npx playwright test e2e/journeys/template-to-project.spec.ts --project=chromium --reporter=line 2>&1 | tail -5` and record the result.

5. Run `npx playwright test e2e/journeys/task-management.spec.ts --project=chromium --reporter=line 2>&1 | tail -5` and record the result.

6. Run `npx playwright test e2e/journeys/team-collaboration.spec.ts --project=chromium --reporter=line 2>&1 | tail -5` and record the result.

7. Run `npx playwright test e2e/journeys/role-permissions.spec.ts --project=chromium --reporter=line 2>&1 | tail -5` and record the result.

8. Run `npx playwright test e2e/journeys/drag-drop.spec.ts --project=chromium --reporter=line 2>&1 | tail -5` and record the result.

9. Run `npx playwright test e2e/journeys/master-library.spec.ts --project=chromium --reporter=line 2>&1 | tail -5` and record the result.

10. Run `npx playwright test e2e/journeys/dashboard.spec.ts --project=chromium --reporter=line 2>&1 | tail -5` and record the result.

11. Run `npx playwright test e2e/journeys/project-management.spec.ts --project=chromium --reporter=line 2>&1 | tail -5` and record the result.

12. Run `npx playwright test e2e/journeys/ui-interactions.spec.ts --project=chromium --reporter=line 2>&1 | tail -5` and record the result.

13. Present a summary table of all results to the user in this format:

| # | Spec File | Result |
|---|-----------|--------|
| 1 | auth.spec.ts | PASS/FAIL |
| 2 | security.spec.ts | PASS/FAIL |
| ... | ... | ... |
