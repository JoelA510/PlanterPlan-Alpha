# PlanterPlan 🌿

**A Project Management Tool for Church Planters.**

PlanterPlan provides a structured, phase-based roadmap for launching new churches. It replaces generic to-do lists with a curated "Master Template" approach, guiding planters from Discovery to Launch.

> **Current Status**: Alpha (v1.0)
> **Specification**: [spec.md](spec.md)
> **Architecture**: [docs/FULL_ARCHITECTURE.md](docs/FULL_ARCHITECTURE.md)

---

## 🏗️ Project Structure

This project is built with:
- **Frontend**: React 19, Vite 7, Tailwind CSS v4
- **Backend**: Supabase (Auth, Postgres, Realtime)
- **Testing**: Playwright (E2E), Vitest (Unit)

For a detailed breakdown of the codebase, see [docs/PROJECT_MIND_MAP.md](docs/PROJECT_MIND_MAP.md).

## 🚀 Getting Started

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run Development Server**
    ```bash
    npm run dev
    ```

3.  **Run E2E Tests**
    ```bash
    npx playwright test
    ```

## 📚 Documentation

- **[Specification & Roadmap](spec.md)** – Functional requirements and status.
- **[Architecture](docs/FULL_ARCHITECTURE.md)** – Technical deep dive.
- **[Repo Context](repo-context.yaml)** – Machine-readable dependency graph.
- **[Lessons Learned](docs/LESSONS.md)** – Engineering log.

## 🤝 Contributing

1.  See [spec.md](spec.md) for the current roadmap.
2.  Check [docs/DEBT_REPORT.md](docs/DEBT_REPORT.md) for known issues.
3.  Run `npm run test` before pushing.
