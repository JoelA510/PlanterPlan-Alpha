# Iterative Prompt-Driven Development (IPDD) Prompt

**Objective:** Iteratively build and refine features through a series of
focused, verifiable steps.

## 🛠️ Instructions

When tasked with a large feature or refactor:

1. **Decompose:** Break the task down into the smallest possible functional
   increments (e.g., 1. API endpoint, 2. Query hook, 3. Base component, 4.
   Composition).
2. **Focus:** Execute strictly ONE increment at a time.
3. **Verify:** After each increment, run the associated lint, type-check, and
   unit test commands. Present the output.
4. **Refine:** If an increment fails or introduces complexity (e.g., FSD
   boundary violation), stop, revert or fix, and refine the prompt for the
   current step.
5. **Proceed:** Only move to the next step when the current increment is fully
   green and compliant with the `.antigravity/rules.md`.

**Key Rule:** Never attempt a "Big Bang" edit. If a change requires touching
more than 3 distinct architectural layers simultaneously, decompose the prompt
further.
