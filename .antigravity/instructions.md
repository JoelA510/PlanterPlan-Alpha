# Project Instructions & Dynamic Context
# Single Source of Truth for Agent Behavior

## 📅 Dynamic Context
**Current Date:** February 10, 2026
**Environment:** Anti-Gravity IDE (Strict Mode)

## 🛠️ Tech Stack (The "Modernity" Protocol)
* **React:** v18.3.1 (Downgraded per ADR-002 for dnd-kit stability. Do NOT use React 19 hooks).
* **Tailwind:** v4.x (CSS-first configuration, semantic variables)
* **Vite:** v7.x (IPv6 safety, native ESM)
* **Supabase:** v2.x (RLS enabled, strict types)
* **Testing:** Vitest (Unit) + Playwright (E2E - Headed Mode Default)

## 📐 Architecture Constraints (FSD)
1.  **Strict Layering:** `app` -> `pages` -> `widgets` -> `features` -> `entities` -> `shared`.
2.  **No Circulars:** A Feature cannot import another Feature directly. Entities cannot import Features.
3.  **Shared Purity:** `src/shared` must contain *only* universal primitives (UI, logic, helpers).
4.  **Entity Isolation:** `src/entities` contains Data Models and Zod Schemas. `src/features` contains View Logic and Complex Interactions.

## 🛡️ Critical Safety Rules
1.  **Date Logic:** NEVER use raw `Date` math. Use `src/shared/lib/date-engine`.
2.  **RLS Safety:** Root inserts (Projects) MUST explicitly set `root_id: null` and `parent_task_id: null` to bypass RLS policies.
3.  **Optimistic UI:** Always implement a rollback mechanism (`onMutate` returns snapshot, `onError` restores it).