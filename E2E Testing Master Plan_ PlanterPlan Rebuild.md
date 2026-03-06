# **PlanterPlan Rebuild: E2E Testing Master Plan**

## **1\. Architectural Philosophy**

As part of the fundamental rewrite of PlanterPlan, the testing strategy is strictly optimized for **true user-fidelity and code-agnostic resilience**. We are discarding atomic unit tests and runtime API data-seeding in favor of continuous, UI-driven User Journeys.

### **Core Principles**

1. **Journey-Based Organization:** Tests are not organized by components (e.g., modals.spec.ts). They are organized by continuous user sessions (e.g., the-daily-loop.spec.ts).  
2. **100% UI-Driven:** Tests start at the front door (/login) and rely entirely on clicks and keystrokes to generate state, ensuring the test experiences exactly what the user experiences.  
3. **The 80/20 Rule:** We are exclusively automating the "Vital Few" critical paths. If these 4 pillars pass, the application's core value proposition is fundamentally sound.

## **2\. The Tooling & Workflow: Author-Time AI (BDD)**

To prevent tests from breaking every time a developer changes a CSS class or button text during the rebuild, we are leveraging an **Author-Time AI approach** using Behavior-Driven Development (BDD) combined with the Antigravity IDE's Gemini browser sub-agent.  
**The Workflow:**

1. **Author Intent:** Developers/QA write tests in plain English within .feature files. This is the code-agnostic source of truth.  
2. **Deploy the Agent:** Using the Antigravity command palette, the developer instructs the Gemini browser sub-agent to navigate the local dev server and map the English steps to the current UI.  
3. **Agent Generates Code:** The agent authors the Playwright TypeScript locators in a steps.ts file.  
4. **Native Execution:** Playwright runs natively at full speed. No runtime AI latency, no API keys, no flakiness.  
5. **UI Updates:** When the UI changes, the .feature file remains untouched. The agent is simply re-prompted to update the underlying steps.ts file to match the new visual layout.

## **3\. The 4 Critical Test Pillars (The 80/20 Core)**

These four continuous journeys cover the absolute critical path of the application.

### **Pillar 1: The Engine Test (Template Generation & Date Cascading)**

**Objective:** Validate the mathematical backbone of the application. A planter must be able to generate a timeline accurately based on their launch date, and changes must cascade perfectly.

* **The Journey:**  
  1. User logs in and initiates a new project.  
  2. User inputs a Project Start Date and Completion Date.  
  3. User selects a standard Master Template.  
  4. **Verify:** The project generates correctly.  
  5. **Verify:** Automatic due dates are mathematically assigned to all tasks relative to the selected date range.  
  6. **Verify:** Milestones and Phases correctly inherit the earliest start date and latest due date from their child tasks.  
  7. User edits the Project Settings to change the Completion Date.  
  8. **Verify:** The date engine re-engages and recalculates all relative due dates across the entire project tree.

### **Pillar 2: The Daily Loop (Task Completion & The "Priority" View)**

**Objective:** Validate the day-to-day user experience. This ensures tasks can be checked off, dependencies are respected, and the Priority view strictly obeys its specific display rules.

* **The Journey:**  
  1. User logs in and navigates to an active project.  
  2. User toggles the board to **Priority View**.  
  3. **Verify:** Only "Current", "Due Soon", and "Overdue" tasks are visible.  
  4. **Verify (Fix):** Empty Milestones (Milestones without accompanying Priority tasks) are completely hidden.  
  5. **Verify (Fix):** Orphaned Tasks correctly display underneath their parent Milestone header.  
  6. User clicks "Complete" on a Task that has outstanding child dependents.  
  7. **Verify:** The system prompts the user with a confirmation warning.  
  8. User confirms the prompt.  
  9. **Verify:** The parent task is marked complete, and all child tasks are auto-marked complete.

### **Pillar 3: The Security & Access Test (Role-Based Access Control)**

**Objective:** Validate that volunteers and outside coaches cannot destroy the project timeline. This requires logging into multiple user personas to verify UI restrictions.

* **The Journey:**  
  1. **Owner Context:** User A logs in as Project Owner. Invites User B (Limited) and User C (Coach) to specific tasks.  
  2. **Full User Context:** User A grants Full User to themselves on a secondary account. Verifies ability to edit *any* task.  
  3. **Limited User Context:** User B logs in.  
     * **Verify:** Can view the entire board.  
     * **Verify:** Edit buttons/inputs are completely disabled or hidden on unassigned tasks.  
     * **Verify:** Edit capabilities are active *only* on tasks explicitly assigned to User B.  
  4. **Coach Context:** User C logs in.  
     * **Verify:** Can view the entire board.  
     * **Verify:** Edit capabilities are active *only* on tasks carrying the specific "Coaching" task type flag.

### **Pillar 4: The Customization Test (Library Injection & Edge Tasks)**

**Objective:** Validate that a project can be safely customized mid-flight without breaking existing data structures, duplicating tasks, or breaking specialized types.

* **The Journey:**  
  1. User logs in and opens an active project.  
  2. User opens the Master Library insertion tool.  
  3. **Verify:** Library tasks/milestones that already exist in the user's project are hidden from the selectable list.  
  4. User adds a standard custom task from the library to a specific phase.  
  5. User completes a "Strategy Template" task.  
  6. **Verify:** The system intercepts the completion and prompts the user to add associated Master Library tasks to support the strategy.  
  7. User adds a "Coaching" type task from the library.  
  8. **Verify:** The system automatically assigns this new task to the user holding the Coach access level.

## **4\. Example: Author-Time BDD Workflow**

To execute this plan using the Antigravity agent, the developers will write .feature files exactly like this. The agent will read this file and generate the Playwright code.  
**File:** e2e/features/daily-loop.feature  
Feature: The Daily Loop and Priority View  
  As a church planter  
  I want to use the Priority view to manage my daily tasks  
  So that I can focus on what is due without clutter

  Scenario: Viewing and completing tasks in the Priority View  
    Given the user is logged into the application  
    And the user navigates to the "Spring Launch" project  
    When the user switches the board to "Priority View"  
    Then the user should not see any milestones that have zero priority tasks  
    And the user should see the task "Draft Budget" grouped under "Phase 1: Planning"  
      
    When the user marks the "Draft Budget" task as complete  
    Then a warning modal should appear asking to complete outstanding subtasks  
    When the user confirms the subtask completion modal  
    Then the task "Draft Budget" should be marked as complete  
    And the subtask "Approve Budget" should automatically be marked as complete

**Antigravity IDE Prompt to generate code:**  
*"Agent, I have updated e2e/features/daily-loop.feature. Please launch the local dev server using the browser sub-agent. Walk through the UI manually to accomplish the steps in the feature file. Write the corresponding Playwright locators and assertions into e2e/steps/daily-loop.steps.ts. Do not use CSS selectors; use ARIA roles, text matching, and test IDs."*