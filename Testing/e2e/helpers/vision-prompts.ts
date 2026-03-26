/**
 * Structured vision verification prompts organized by page/component.
 *
 * Each prompt describes WHAT should be visually present — not HOW it's implemented.
 * This makes tests resilient to DOM structure, class names, and element ID changes.
 *
 * Prompts are written as yes/no questions that Gemini can answer with high confidence.
 */

export const VISION_CHECKS = {
  // ── Authentication ────────────────────────────────────────────────────
  login: {
    hasLoginForm:
      'Is there a login/sign-in form visible with email and password input fields?',
    hasSubmitButton:
      'Is there a prominent submit button (like "Sign In" or "Sign Up") on this page?',
    hasBranding:
      'Is the application name or logo visible at the top of the form?',
    hasToggleLink:
      'Is there a link or button to switch between sign-in and sign-up modes?',
  },

  // ── Dashboard ─────────────────────────────────────────────────────────
  dashboard: {
    hasProjectCards:
      'Are there one or more project cards visible showing project information?',
    hasPipelineBoard:
      'Is there a kanban/pipeline board with multiple columns visible on this page?',
    hasStatsOverview:
      'Are there statistics/summary cards at the top showing numerical data (like total projects, tasks, etc.)?',
    hasCreateButton:
      'Is there a button to create a new project visible?',
    hasEmptyState:
      'Does this page show an empty state message indicating no projects exist?',
  },

  // ── Project Detail ────────────────────────────────────────────────────
  project: {
    hasProjectHeader:
      'Is there a project header/title section at the top with project metadata?',
    hasPhaseCards:
      'Are there phase or section cards visible in the project view?',
    hasTaskList:
      'Is there a list of tasks or task items visible on this page?',
    hasBoardView:
      'Is there a kanban board with columns for different task statuses?',
    hasProgressIndicator:
      'Is there a progress bar or percentage indicator showing project completion?',
    hasMilestones:
      'Are there milestone sections with grouped tasks visible?',
    hasTeamAvatars:
      'Are there team member avatars or icons visible in the project header area?',
  },

  // ── Task Details Panel ────────────────────────────────────────────────
  taskDetails: {
    hasPanelOpen:
      'Is there a side panel or detail view open showing task information?',
    hasTaskTitle:
      'Is there a task title/heading visible in a detail panel?',
    hasStatusIndicator:
      'Is there a status badge or dropdown showing the current task status?',
    hasActionButtons:
      'Are there action buttons (like edit, delete, complete) visible for the task?',
    hasDateFields:
      'Are there date fields (start date, due date) visible in the task detail?',
  },

  // ── My Tasks ──────────────────────────────────────────────────────────
  myTasks: {
    hasTaskList:
      'Is there a list of tasks assigned to the user visible?',
    hasViewToggle:
      'Are there buttons or tabs to toggle between list and board views?',
    hasBoardColumns:
      'Is there a kanban board with status columns visible?',
    hasEmptyState:
      'Does this page show a message indicating no tasks are assigned?',
  },

  // ── Reports ───────────────────────────────────────────────────────────
  reports: {
    hasProjectSelector:
      'Is there a dropdown or selector to choose a project for reports?',
    hasCharts:
      'Are there data visualization charts (bar chart, pie chart, etc.) visible?',
    hasStatsCards:
      'Are there summary statistics cards showing numerical data?',
    hasProgressSection:
      'Is there an overall progress section or progress bar visible?',
  },

  // ── Settings ──────────────────────────────────────────────────────────
  settings: {
    hasProfileForm:
      'Is there a profile editing form with input fields for user information?',
    hasAvatarSection:
      'Is there an avatar/profile picture section visible?',
    hasSaveButton:
      'Is there a save/update button visible on this settings page?',
    hasToggleSettings:
      'Are there toggle switches for notification or preference settings?',
  },

  // ── Team ──────────────────────────────────────────────────────────────
  team: {
    hasMemberList:
      'Is there a list of team members with names and roles visible?',
    hasInviteOption:
      'Is there a button or action to invite new team members?',
    hasRoleBadges:
      'Are there role badges or indicators next to team member names?',
  },

  // ── Navigation ────────────────────────────────────────────────────────
  navigation: {
    hasSidebar:
      'Is there a navigation sidebar visible on the left side of the page?',
    hasHeader:
      'Is there a top header/navigation bar with branding and user menu?',
    hasProjectList:
      'Is there a list of projects visible in the sidebar navigation?',
    hasBreadcrumb:
      'Is there a breadcrumb trail or page title in the header area?',
  },

  // ── Onboarding ────────────────────────────────────────────────────────
  onboarding: {
    hasWizardDialog:
      'Is there a modal dialog or wizard visible with step-by-step content?',
    hasStepIndicator:
      'Is there a step indicator or progress dots showing wizard progress?',
    hasNameInput:
      'Is there an input field for entering a project or church name?',
    hasTemplateSelection:
      'Are there template cards or options to choose from?',
  },

  // ── Mobile ────────────────────────────────────────────────────────────
  mobile: {
    hasMobileLayout:
      'Does this page appear to be in a mobile/narrow layout with stacked content?',
    hasFAB:
      'Is there a floating action button (circular button) in the bottom-right area?',
    hasMobileMenu:
      'Is there a hamburger menu icon or mobile menu button visible?',
    hasAgenda:
      'Is there a daily agenda or today\'s tasks card visible?',
  },

  // ── Home/Landing ──────────────────────────────────────────────────────
  home: {
    hasHeroSection:
      'Is there a hero section with a large heading and call-to-action button?',
    hasFeatureCards:
      'Are there feature description cards or sections highlighting product capabilities?',
    hasSignUpCTA:
      'Is there a prominent call-to-action button for signing up or getting started?',
    hasNavigation:
      'Is there a top navigation bar with links and a logo?',
  },

  // ── Error States ──────────────────────────────────────────────────────
  errorStates: {
    hasErrorMessage:
      'Is there an error message or error state indication visible on this page?',
    hasRetryOption:
      'Is there a retry button or action to recover from the error?',
    hasEmptyState:
      'Is there an empty state illustration or message with a call-to-action?',
  },
} as const;

export type VisionPage = keyof typeof VISION_CHECKS;
export type VisionCheck<P extends VisionPage> = keyof (typeof VISION_CHECKS)[P];
