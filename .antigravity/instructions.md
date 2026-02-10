# Project Instructions & Dynamic Context
# Single Source of Truth for Agent Behavior

## 📅 Dynamic Context
**Current Date:** February 9, 2026
**Environment:** Anti-Gravity IDE (Strict Mode)

## 🛠️ Tech Stack (The "Modernity" Protocol)
* **React:** v19.x (No `forwardRef`, use `useActionState`, strict hydration)
* **Tailwind:** v4.x (CSS-first configuration, semantic variables)
* **Vite:** v7.x (IPv6 safety, native ESM)
* **Supabase:** v2.x (RLS enabled, strict types)

## 📐 Architecture Constraints (FSD)
1.  **Strict Layering:** `app` -> `features` -> `shared`.
2.  **No Circulars:** A Feature cannot import another Feature directly.
3.  **Shared Purity:** `src/shared` must contain *only* universal primitives (UI, logic, helpers).

## 🛡️ Critical Safety Rules
1.  **Date Logic:** NEVER use raw `Date` math. Use `src/shared/lib/date-engine`.
2.  **RLS Safety:** Never create a policy without checking `root_id` or tenant isolation.
3.  **Optimistic UI:** Always implement a rollback mechanism for optimistic updates.