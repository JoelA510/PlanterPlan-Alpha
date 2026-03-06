# Pillar 1: The Engine Test (Template Generation & Date Cascading)

**Objective:** Validate the mathematical backbone of the application by ensuring project templates cascade dates correctly.

## Instructions for Browser Subagent

1.  **User logs in and initiates a new project:**
    - Navigate to the login page.
    - Log in using a standard test account.
    - Navigate to the dashboard.
    - Click on the button to create a new project.

2.  **User inputs a Project Start Date and Completion Date:**
    - In the project creation modal, set the project Title to "Date Engine Test Project".
    - Select a Start Date of today.
    - Select a Completion Date 30 days from today.

3.  **User selects a standard Master Template:**
    - Choose a standard pre-existing template from the templates dropdown or selector (e.g., "Standard Project Template").
    - Confirm and generate the project.

4.  **Verify: The project generates correctly:**
    - Wait for the project board to load.
    - Visually confirm that the new project title is present and the task tree has populated with milestones and tasks.

5.  **Verify: Automatic due dates are mathematically assigned:**
    - Inspect the individual tasks in the tree.
    - Confirm that due dates assigned to the tasks cleanly fall within the 30-day window selected.

6.  **Verify: Milestones and Phases correctly inherit dates:**
    - Confirm that the top-level Milestone displays a start date and due date that appropriately encapsulate its child tasks.

7.  **User edits the Project Settings to change the Completion Date:**
    - Navigate to the Project Settings or Metadata editing tool.
    - Change the Completion Date to be 60 days from today instead of 30.
    - Save the changes.

8.  **Verify: The date engine re-engages and recalculates all relative due dates:**
    - Return to the task tree.
    - Inspect the same milestones and tasks from Step 5 and 6.
    - Confirm visually that the due dates have expanded and completely recalculated to span the new 60-day window.
