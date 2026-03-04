# Behavior-Driven Development (BDD) Prompt

**Objective:** Bridge the gap between user requirements and technical
implementation using a ubiquitous vocabulary.

## 🛠️ Instructions

When planning a feature or writing Playwright E2E / Vitest integration tests:

1. **Format:** Structure your scenarios using `Given`, `When`, `Then`.
   - **Given** some initial context (the database state, the authenticated
     user).
   - **When** an action occurs (a button click, a form submission).
   - **Then** ensure an observable outcome (a toast appears, a row is added).

2. **Test Implementation:**
   - Map `Given` to test setup and factories (`beforeEach`, seeds).
   - Map `When` to user interactions (`userEvent.click`,
     `page.locator().click()`).
   - Map `Then` to assertions (`expect(...).toBeVisible()`).

3. **Focus:**
   - Test user-facing behavior, not internal implementation details (e.g., test
     that a task appears on the board, not that `useTaskQuery` was called).
   - Base all feature implementation on passing the BDD scenarios defined in the
     `implementation_plan.md` or `TEST_PLAN.md`.
