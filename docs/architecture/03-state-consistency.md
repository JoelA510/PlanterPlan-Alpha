# State Consistency & Optimistic UI

## Drag-and-Drop (DND) Lifecycle
Our DND system uses Optimistic UI for perceived performance. This introduces a risk of "Lying to the User" if the backend fails.

### The Contract
1.  **User Action:** Drag End event fires.
2.  **Optimistic Update:** React State updates immediately. The item moves visually.
3.  **Async Sync:** API call (`updateTaskPosition`) is sent to Supabase.
4.  **Failure Handling (CRITICAL):**
    * If the API call fails (catch block), the app **MUST** trigger a full `fetchTasks()` to rollback the UI to the server state.
    * **Do not** try to manually "undo" the move; reload the truth.

## Scoping Rules
* **Global Positioning is Banned:** All positioning logic (renormalization, gap filling) must be scoped by `root_id` (Project) or `owner_id`.
* **Risk:** Updating positions without a scope filter will corrupt tasks in *other users'* private projects.

## Date Calculations
* **Directional Flow:**
    * **Push:** Parent start date changes -> Shifts all children by delta.
    * **Pull:** Child duration expands -> Extends parent max date.
* **Batching:** Calculate all dates in memory, then commit in one batch. Avoid chained `useEffect` loops.

## Timezone Normalization
* **Rule:** Project Dates are Data, not Points in Time.
* **Implementation:** Always normalize input dates to UTC Midnight (`T00:00:00.000Z`) before saving.
