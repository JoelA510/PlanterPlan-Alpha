# Testing Strategy

## Test Layers

### 1. Unit Tests (Strict)
* **Focus:** Pure logic (Date math, Tree recursion, ID generation).
* **Tool:** Jest (`npm test`).
* **Location:** `src/utils/*.test.js`.
* **Mandatory:** Any change to `dateUtils.js` requires a passing regression test suite covering Leap Years and Timezone boundaries.

### 2. Integration Tests (Mocked)
* **Focus:** Service layer interacting with Supabase.
* **Tool:** Jest with `jest.mock`.
* **Location:** `src/services/*.test.js`.
* **Requirement:** Must verify that `AbortController` signals are passed to the client.

### 3. Linting as Law
* **Command:** `npm run lint`
* **Policy:** Zero Tolerance. `max-warnings=0`.
* **Why:** React Hook dependencies are critical for preventing stale closures in DND handlers.

## Manual Verification (The "Human Check")
For features involving Drag-and-Drop:
1.  Open two browser windows.
2.  Drag an item in Window A.
3.  Verify it moves in Window B (Realtime/Refetch).
4.  Disconnect Network -> Drag -> Verify Rollback on Reconnect/Error.
