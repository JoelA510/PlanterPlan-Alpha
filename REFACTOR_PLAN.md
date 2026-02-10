# Master Refactor Plan: FSD & Hardening

## Phase 1: Foundation (High Priority)
- [x] **Directory Struct**: Create FSD layers (app, pages, widgets, features, entities, shared).
- [x] **Shared Migration**: Move generic UI/Lib to `src/shared`.
- [x] **RLS Optimization**: Audit `schema.sql` for `(select auth.uid())` pattern. 

## Phase 2: Domain Isolation
- [x] **Entity: Task**: Extract `Task` model/zod schema to `src/entities/task`.
- [x] **Entity: Project**: Extract `Project` model to `src/entities/project`.
- [x] **Feature: Drag**: Isolate `useTaskDrag` logic to `src/features/task-drag`.

## Phase 3: Visuals & UX
- [x] **Design Tokens**: Define semantic variables in `src/styles/index.css`.
- [x] **Optimistic UI**: Standardize rollback logic in `useTaskMutations.js`.
- [x] **Performance**: Lazy load `Reports` and `Settings` pages.
