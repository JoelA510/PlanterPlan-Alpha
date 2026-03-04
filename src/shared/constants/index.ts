/**
 * Shared Constants
 *
 * Constants that both `shared/` and `app/` layers need.
 * Canonical source of truth — `app/constants/index.js` re-exports these.
 */

export * from './domain';

// Position spacing for drag-and-drop reordering
export const POSITION_STEP = 10000;
