# Feature: Tasks

This directory contains the **View Logic** and **Feature-Specific Components** for the Task domain.

## 🏗️ FSD Separation

- **`src/entities/task`**: Data models & Zod schemas.
- **`src/features/tasks`**: UI components & Views.
- **`src/features/task-drag`**: Drag-and-drop logic.

## 📦 Service Architecture

- `components/`: UI Components (TaskBoard, TaskList, TaskCard).
- `hooks/`: Feature hooks (`useTaskBoard`, `useTaskMutations`, `useTaskQuery`).
- `services/`: API wrappers that consume `src/shared/api` or `src/entities/task`.
