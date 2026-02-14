---
description: Run the full E2E test suite using the Hybrid Verification strategy (Automated + Agentic).
---

1. **Automated Verification**:
   - Run the `/run-e2e` workflow to execute every spec file individually.
   - Review the summary table for any FAIL results.
   - *Note*: If the environment blocks output capture, proceed to step 2 as the primary verification.

2. **Agentic Verification (Browser)**:
   - Identify critical flows to test from `docs/operations/agent-test-scripts.md`.
   - Invoke the `browser_subagent` tool.
   - **Prompt**: "Execute the 'Golden Path: Project Creation' sanity check from agent-test-scripts.md. Report any visual regressions or failures."
   - **Record**: Save the verification result (Pass/Fail) in the current task or PR description.

3. **Reporting**:
   - If issues are found, log them in `TODO.md` or create a new issue.
   - If all pass, mark the task as verified.
