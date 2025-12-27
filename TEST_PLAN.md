# Test Plan: MasterLibraryList Refactor

## Goal

Verify the refactor of `MasterLibraryList`, `TaskItem`, and `treeHelpers` improves performance and correctness without regressing existing functionality.

## Blast Radius

- `src/components/organisms/MasterLibraryList.jsx`
- `src/components/molecules/TaskItem.jsx`
- `src/utils/treeHelpers.js`
- `src/components/organisms/TaskList.jsx` (Consumer of TaskItem)

## Test Cases

### Automated Tests

1. **MasterLibraryList Unit Tests**
   - **Command**: `npm test src/components/organisms/MasterLibraryList.test.jsx`
   - **Happy Path**:
     - Renders list of tasks.
     - Toggles expansion and fetches children.
     - Updates task status optimistic UI.
   - **Sad Path**:
     - Handles load errors (verified via code inspection, mocking error scenarios in test would be an extension).

2. **Regression Testing**
   - **Command**: `npm test`
   - Run all existing tests to ensure no breakage in services or other utils.

### Manual Verification (if applicable via browser)

- None planned as this is a backend/component refactor and I am verifying via automated tests.

## Verification Commands

1. `npm test src/components/organisms/MasterLibraryList.test.jsx`
2. `npm test src/utils/treeHelpers.js` (if it existed, but we rely on integration usage in MasterLibraryList test).
