# docs/architecture/library-templates.md

## Domain Overview
The Library & Templates domain provides the administrative scaffolding for PlanterPlan. It encompasses reusable Project Templates, a standardized Master Library of tasks, and a centralized Resource Library, maintained exclusively by system Administrators.

## Core Entities & Data Models
* **Template:** A non-executable blueprint containing predefined Phase/Milestone/Task hierarchies.
* **Master Library Item:** A reusable object strictly tagged as `Phase`, `Milestone`, or `Task`. (Subtasks are invalid in the Master Library).
* **Resource:** A centralized external link or document reference.

## State Machines / Lifecycles
### Template Instantiation
1. **Selection:** User selects a template during Project Creation.
2. **Cloning:** The Master Template tree is recursively copied into a new Project ID instance.
3. **Date Resolution:** Relative `duration` and `days from start` are converted into hard ISO dates based on the user's `Target Launch Date`.

## Business Rules & Constraints
* **Template UI Limitations:** Template items do *not* possess progress bars, status dropdowns, or Date Engine urgency states.
* **Master Library Strictness:**
  * Items created dynamically inside a Template are *not* automatically added to the Master Library. They must be explicitly promoted via UI action.
  * Instantiating a Master Library task into a project copies its data completely, allowing decoupled custom edits by the user.
* **Creation Interface:** Adding new entities to templates triggers a dedicated modal form titled dynamically based on the entity type.

## Integration Points
* **Auth / RBAC:** The Master Library and Templates are invisible to standard App Users. Only Admin roles can View, Edit, or Mutate the library.
* **Projects:** Serves as the origin layer for `CreateProjectModal`.

## Known Gaps / Technical Debt
* Versioning of templates: Currently, if an Admin updates a Template, existing Projects created from it are not updated (which is intended), but tracking the original template version on the Project instance is missing.