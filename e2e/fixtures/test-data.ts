/** Primary test user — seeded by scripts/seed-e2e.js */
export const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
} as const;

/**
 * Secondary users for RBAC testing.
 * These must be seeded in global-setup or via seed-e2e.js.
 */
export const ROLE_USERS = {
  owner: { email: 'owner@example.com', password: 'password123' },
  editor: { email: 'editor@example.com', password: 'password123' },
  viewer: { email: 'viewer@example.com', password: 'password123' },
  limited: { email: 'limited@example.com', password: 'password123' },
  coach: { email: 'coach@example.com', password: 'password123' },
} as const;

/** Well-known selectors used across multiple POMs */
export const SELECTORS = {
  // Toast notifications (Sonner)
  toastContainer: '[data-sonner-toaster]',
  toast: '[data-sonner-toast]',

  // Loading indicators
  spinner: '.animate-spin',

  // Sidebar
  sidebar: 'aside',
  sidebarProjectItem: '[data-testid="sidebar-project"]',

  // Header
  headerUserMenu: '[data-testid="user-menu"]',

  // Command palette
  commandPalette: '[cmdk-dialog]',
  commandInput: '[cmdk-input]',

  // Modals / Dialogs
  dialog: '[role="dialog"]',
  dialogClose: '[data-testid="dialog-close"]',
} as const;

/** Auth storage state file paths */
export const AUTH_STATES = {
  user: 'e2e/.auth/user.json',
  owner: 'e2e/.auth/owner.json',
  editor: 'e2e/.auth/editor.json',
  viewer: 'e2e/.auth/viewer.json',
  limited: 'e2e/.auth/limited.json',
  coach: 'e2e/.auth/coach.json',
} as const;
