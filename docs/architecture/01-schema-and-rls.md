# Schema & RLS Contract

## Core Security Principle

We rely on Row Level Security (RLS) for all data isolation.
**CRITICAL RULE:** RLS policies must **never** be recursive. They must execute in O(1) time complexity relative to the table depth.

## The `root_id` Pattern

To avoid recursion in hierarchical data (Task Trees), we denormalize the `root_id` (Project ID) onto every task row.

### 1. Database Schema

- **Table:** `tasks`
- **Column:** `root_id` (UUID, NOT NULL)
- **Constraint:** Foreign Key to `tasks.id` (self) or `projects.id`.

### 2. The Trigger Contract (`maintain_task_root_id`)

- **Input:** `INSERT` or `UPDATE` on `parent_task_id`.
- **Logic:**
  - IF `parent_task_id` is NULL -> `root_id` = `id` (I am the root).
  - IF `parent_task_id` is SET -> `root_id` = `parent.root_id`.
- **Optimization:** The trigger must `RETURN NEW` immediately if `NEW.root_id` is already valid (supports bulk-loading).

### 3. RLS Policy Standard

**Do not** join `tasks` to itself.

- **Correct:** `auth.uid() IN (SELECT user_id FROM project_members WHERE project_id = root_id)`
- **Incorrect:** `auth.uid() IN (SELECT ... WHERE task_id = parent_task_id ...)`

## Identity Generation

- **Rule:** For "Deep Clones" (Templates -> Projects), IDs are generated **Client-Side** (in-memory) before insertion.
- **Reason:** Allows constructing the full dependency graph without waiting for DB round-trips.
- **Risk:** DB Auto-generated IDs cause race conditions where children insert before parents.

## Anti-Patterns

- **Reliance on frontend filtering:** Never rely on JS `filter()` for security. If the data reached the client, it is already leaked.
- **Ambiguous Column References:** In seed scripts, always alias tables (`SELECT p.id FROM projects p...`).
