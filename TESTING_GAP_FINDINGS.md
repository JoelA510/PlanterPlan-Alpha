# TESTING_GAP_FINDINGS

This document logs the discrepancies between the requirements listed in
`Notion Exports/User Testing Plan` and the current E2E test coverage in
`e2e/features`.

## 1. Roles & Permissions Gaps

| Requirement (Notion)                     | E2E Coverage Status | Notes                                                                                                                                |
| ---------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Coach Role**                           | 🔴 Missing          | Notion: "can view any task but can only edit coaching tasks". No E2E tests found for this role.                                      |
| **Limited User (Viewer) Edit Exception** | 🟡 Partial          | Notion: "can view any task but can only edit their own assigned tasks". E2E tests verify view-only but not the "edit own" exception. |
| **Invite Project Users (Full Flow)**     | 🟢 Covered          | Covered in `project/invite-member.feature` and `team/team-management.feature`.                                                       |

## 2. Task Field Verification Gaps

| Requirement (Notion)     | E2E Coverage Status | Notes                                                                                  |
| ------------------------ | ------------------- | -------------------------------------------------------------------------------------- |
| **Purpose**              | 🔴 Missing          | Field mentioned in Notion but not explicitly verified in `task-details-panel.feature`. |
| **Actions**              | 🔴 Missing          | Field mentioned in Notion but not explicitly verified.                                 |
| **Notes**                | 🔴 Missing          | Field mentioned in Notion but not explicitly verified.                                 |
| **Additional Resources** | 🟢 Covered          | Covered in `project/task-resources.feature`.                                           |

## 3. Hierarchy & Subtask Gaps

| Requirement (Notion)                     | E2E Coverage Status | Notes                                                                                                                   |
| ---------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Subtasks (Task-to-Subtask)**           | 🔴 Missing          | E2E `task-dnd-reorder.feature` covers Milestone-level DND but doesn't explicitly test nesting a task into a subtask.    |
| **Hierarchy Invariants**                 | 🔴 Missing          | Notion: "If an item is a phase, it cannot be changed to a milestone...". No tests found for these negative constraints. |
| **Project/Template Task Hierarchy View** | 🟢 Covered          | Covered in `project/milestone-tasks.feature` and `project/project-detail.feature`.                                      |

## 4. Master Library & Template Gaps

| Requirement (Notion)          | E2E Coverage Status | Notes                                                                                                         |
| ----------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Add to Master Library**     | 🔴 Missing          | Requirement: "can add task from template to master library". No E2E tests for pushing _to_ the library.       |
| **Direct Library Management** | 🔴 Missing          | Requirement: "create new task in the master library (not tied to any template)". No E2E tests found.          |
| **Direct Template Editing**   | 🔴 Missing          | E2E covers creation _from_ templates but lacks testing for direct editing (CRUD) of the templates themselves. |

## 5. Advanced Logic ("For Later" in Notion)

| Requirement (Notion)           | E2E Coverage Status | Notes                                                               |
| ------------------------------ | ------------------- | ------------------------------------------------------------------- |
| **Auto-update Children Tasks** | 🔴 Missing          | "edit milestone completeness status (auto updates children tasks)". |
| **Mark task as N/A**           | 🔴 Missing          | Mentioned in Notion "for later" section.                            |
| **License Restrictions**       | 🔴 Missing          | "license restrictions for project creation".                        |

---

**Log Date**: 2026-03-24 **Source**:
`Notion Exports/User Testing Plan 845f6e15795b82b58eaf0182abd6859b.md`
**Analysis Baseline**: `e2e/features/` (18 domains)
