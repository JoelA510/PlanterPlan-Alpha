# Pull Request: Documentation Standardization & Engineering Knowledge Base

## 📋 Summary

- **Consolidated Documentation**: Moved root-level documentation templates (`README-PROMPT.md`, `README-TEMPLATE.md`) into `docs/` to reduce clutter.
- **Established Knowledge Base**: Created `docs/ENGINEERING_KNOWLEDGE.md`, a structured database of 12 critical engineering lessons (RLS, DnD, Date logic) to prevent regression.
- **Standardized Workflows**: Introduced `docs/git_documentation/PR-PROMPT.md` to ensure consistent, high-quality PR descriptions moving forward.
- **Updated Roadmap**: Refreshed `roadmap.md` with a complete historical timeline and current UX workflow status.

## 🗺️ Roadmap Progress

| Item ID    | Feature Name             | Phase       | Status  | Notes                      |
| ---------- | ------------------------ | ----------- | ------- | -------------------------- |
| [DOCS-001] | Documentation Refactor   | Maintenance | ✅ Done | Moved templates to `docs/` |
| [DOCS-002] | Engineering Knowledge DB | Maintenance | ✅ Done | Added 12 initial entries   |
| [DOCS-003] | PR Standardization       | Maintenance | ✅ Done | Added Templates & Prompts  |
| [META-001] | Roadmap History          | Meta        | ✅ Done | Added timeline & UX status |

## 🏗️ Architecture Decisions

### Key Patterns & Decisions

- **"Evidence-Based" Documentation**: All documentation files are now centralized in `docs/` (except the main `README.md`). This separation allows the root directory to focus on project configuration.
- **Persistent Agent Memory**: Created `.agent/workflows/ai_standards.md` to codify the "Critical Rules" found in the Knowledge Base, ensuring future AI interactions adhere to established project standards automatically.
- **Living Knowledge Base**: `ENGINEERING_KNOWLEDGE.md` uses a strict tagging system (`[ID]`, `#tags`) to make it easily parsable by both humans and LLMs during context retrieval.

### Logic Flow / State Changes

N/A (Documentation changes only)

## 🔍 Review Guide

### 🚨 High Risk / Security Sensitive

- None.

### 🧠 Medium Complexity

- `docs/ENGINEERING_KNOWLEDGE.md` - Review the "Critical Rules" to ensure they align with team consensus.

### 🟢 Low Risk / Boilerplate

- `roadmap.md` - Text updates.
- `docs/operations/README-PROMPT.md` - Reference path updates.
- `docs/PR-TEMPLATE.md` - New file.
- `docs/git_documentation/PR-PROMPT.md` - New file.

## 🧪 Verification Plan

### 1. Environment Setup

- [ ] No new dependencies.
- [ ] No migrations.

### 2. Seed Data

N/A

### 3. Test Scenarios

1. **Verify File Structure**: Ensure `docs/` contains `README-PROMPT.md`, `README-TEMPLATE.md`, `ENGINEERING_KNOWLEDGE.md`, `PR-TEMPLATE.md`, and `PR-PROMPT.md`.
2. **Verify Links**: Click the "Engineering Knowledge Base" link in `README.md` to ensure it resolves.
3. **Verify Roadmap**: Open `roadmap.md` and check the "Project History" section.

---

<details>
<summary><strong>📉 Detailed Changelog (Collapsible)</strong></summary>

- `docs/ENGINEERING_KNOWLEDGE.md`: New file (12 entries).
- `docs/PR-TEMPLATE.md`: New file.
- `docs/PR-PROMPT.md`: New file.
- `docs/README-PROMPT.md`: Moved from root.
- `docs/README-TEMPLATE.md`: Moved from root.
- `roadmap.md`: Updated with history table.
- `.agent/workflows/ai_standards.md`: New file.

</details>
