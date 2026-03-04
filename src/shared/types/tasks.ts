import type { TaskRow } from '@/shared/db/app.types';

/**
 * Extended task type used across features for tree-based task rendering.
 * Lives in shared/ to avoid lateral imports between feature slices.
 */
export interface TaskItemData extends TaskRow {
    children?: TaskItemData[];
    isExpanded?: boolean;
    isAddingInline?: boolean;
    duration?: string;
    resource_type?: string;
    membership_role?: string;
}
