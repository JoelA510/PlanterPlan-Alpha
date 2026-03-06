# Pillar 4: The Customization Test (Library Injection & Edge Tasks)

**Objective:** Validate that a project can be safely customized mid-flight by injecting new modules from the Master Library.

## Instructions for Browser Subagent

1.  **User logs in and opens an active project:**
    - Log in as the Project Owner or a Full User.
    - Navigate to an ongoing project.

2.  **User opens the Master Library insertion tool:**
    - Locate and click the "Add from Library" or "Insert Template" button.

3.  **Verify: Library tasks/milestones that already exist in the user project are hidden:**
    - Review the list of available modules to insert.
    - Confirm that the template modules currently active in the project are not selectable, preventing accidental duplication.

4.  **User adds a standard custom task from the library to a specific phase:**
    - Select a new module/task from the library.
    - Choose a destination Phase or Milestone within the current project.
    - Click insert.
    - Confirm the new task appears in the designated destination.

5.  **User completes a "Strategy Template" task:**
    - Locate a task labeled as a "Strategy Template".
    - Mark it as complete.

6.  **Verify: The system intercepts the completion and prompts the user:**
    - Confirm a prompt appears suggesting the user inject associated Master Library tasks that support the strategy they just completed.

7.  **User adds a "Coaching" type task from the library:**
    - Return to the Master Library insertion tool.
    - Select a specialized "Coaching" task module.
    - Insert it into the project.

8.  **Verify: The system automatically assigns this new task:**
    - Open the newly inserted coaching task.
    - Confirm that the system has automatically assigned the task to the user holding the "Coach" role in the project members list.
