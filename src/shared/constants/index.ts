/**
 * Shared Constants
 *
 * Constants that both `shared/` and `app/` layers need.
 * Canonical source of truth — `app/constants/index.js` re-exports these.
 */

export const ROLES = {
    OWNER: 'owner',
    EDITOR: 'editor',
    COACH: 'coach',
    VIEWER: 'viewer',
    LIMITED: 'limited',
    ADMIN: 'admin',
} as const;

// Position spacing for drag-and-drop reordering
export const POSITION_STEP = 10000;
