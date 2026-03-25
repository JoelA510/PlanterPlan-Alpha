# TESTING_GAP_FINDINGS (Thorough Pass)

This document provides a granular log of discrepancies between the comprehensive
`Notion Exports` requirements and the current E2E test suite in `e2e/features/`.

## 1. Hierarchy & Structural Invariants

| Requirement (Notion)     | E2E Status | Notes                                                                                                                  |
| ------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| **5-Level Hierarchy**    | 🔴 Missing | Notion: `Project -> Phase -> Milestone -> Task -> Subtask`. E2E lacks explicit tests for **Subtask** nesting and CRUD. |
| **Hierarchy Invariants** | 🔴 Missing | No negative tests for logic preventing Phase $\rightarrow$ Milestone transformations, etc.                             |
| **Default View State**   | 🔴 Missing | Notion: "every milestone is visible and expanded" by default on project load.                                          |

## 2. Functional Logic & Automation

| Requirement (Notion)   | E2E Status | Notes                                                                                         |
| ---------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| **Auto-Mark Children** | 🔴 Missing | "Auto-mark all children complete when parent marked complete".                                |
| **Date Rollups**       | 🔴 Missing | "Phase/milestone due dates based on child task due dates".                                    |
| **Auto-Date Shifting** | 🟡 Partial | E2E has some recalculation warnings, but lacks deep verification of automated shifts via DND. |
| **Dependency Prompts** | 🔴 Missing | Confirmation prompt when completing tasks with outstanding dependents.                        |

## 3. Roles & Account Management

| Requirement (Notion)            | E2E Status | Notes                                                                 |
| ------------------------------- | ---------- | --------------------------------------------------------------------- |
| **Coach Role Permissions**      | 🔴 Missing | "View any, edit only coaching-labeled tasks".                         |
| **Limited User Edit Exception** | 🔴 Missing | Verification that Limited Users can edit _only_ their assigned tasks. |
| **Signup Confirmation**         | 🔴 Missing | Verification of the email link confirmation flow.                     |
| **Password Recovery**           | 🔴 Missing | "Forgot password" flow is entirely untested in E2E.                   |

## 4. Reporting & Analytics

| Requirement (Notion)  | E2E Status | Notes                                                          |
| --------------------- | ---------- | -------------------------------------------------------------- |
| **Advanced Reports**  | 🔴 Missing | Monthly reports, Progress charts for Phases (Donut charts).    |
| **Automation/Export** | 🔴 Missing | Downloadable (CSV/PDF) and Automated Emailable status reports. |

## 5. Library & Template Management (Admin)

| Requirement (Notion)      | E2E Status | Notes                                                                           |
| ------------------------- | ---------- | ------------------------------------------------------------------------------- |
| **Resource Library CRUD** | 🔴 Missing | Admin ability to create/manage the global resource library.                     |
| **Master Library CRUD**   | 🔴 Missing | Ability to add project tasks to library or create library-only tasks.           |
| **In-Library Indicator**  | 🔴 Missing | Visual feedback in task details that a task exists in the Master Library.       |
| **Direct Template Edit**  | 🔴 Missing | E2E only tests creation _from_ templates, not editing the templates themselves. |

## 6. Alternate Architecture

| Requirement (Notion)  | E2E Status | Notes                                        |
| --------------------- | ---------- | -------------------------------------------- |
| **Phase Unlocking**   | 🔴 Missing | "Next Phase unlocks when previous complete". |
| **No Due Dates Mode** | 🔴 Missing | Interface option to omit dates.              |

---

**Log Date**: 2026-03-24 **Source**: `Notion Exports` (Full directory audit)
**Analysis Baseline**: 18 E2E feature domains in `e2e/features/`
