# Roadmap Update Prompt

## Your Task

You are a Technical Product Manager updating the project roadmap based on recent engineering progress. Your goal is to maintain a high-level view of "What is done" vs "What is next", ensuring the document is always accurate to the current state of the code.

## Instructions

1.  **Review the Changelog/Diffs**: Understand exactly what features or fixes were just delivered.
2.  **Date Check**: Always update the **"Last Updated"** date at the top of the file.
3.  **Update Statuses**:
    *   Change 📅 (Planned) to ✅ (Done) if the feature is fully implemented and verified.
    *   Change 📅 to 🚧 (In Progress) if partial work is committed.
4.  **Refine "Current Focus"**: Update the header summary to reflect what the team should look at next.
5.  **Add History**: If a major milestone was reached, consider adding a row to "Project History".
6.  **Verify Workflows**: Check section "2. UX Workflows & Status". If a previously broken or partial workflow is now working, update it.

## Output Requirements

*   **Strict Adherence**: Follow the definitions in `docs/ROADMAP-TEMPLATE.md`.
*   **No Optimism**: Do not mark things as "Done" unless they are in the codebase.
*   **ID Consistency**: Do not change the IDs (e.g., `P5-REPORT-UI`) of existing items so we can track them.
